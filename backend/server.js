const express = require('express');
const twilio = require('twilio');
const connectDB = require('./db');
const passport = require('./config/passportConfig');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const User = require("./models/user");
const interviews = new Map();
const ScheduledCall = require("./models/ScheduledCall");
const nodemailer = require('nodemailer');
require('dotenv').config();
const { transcribeAudio, getAiResponse } = require('./interview');
const { convertAudio } = require('./audioProcessor'); 
const app = express();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const allowedOrigins = [
  "http://localhost:3000",
  "https://moon-ai-one.vercel.app"
];
const WebSocket = require('ws');

// Create WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({
  server,
  path: '/stream',
  clientTracking: true,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024,
  verifyClient: (info, cb) => {
    cb(true, 200, 'OK', { 'Connection': 'Upgrade' });
  }
});

// Express Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Connect to MongoDB
connectDB();

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend/Twilio server is running!');
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "adyatwr@gmail.com",
    subject: "New Message from Moon AI Contact Form",
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

wss.on('connection', (ws) => {
  let callSid, processor;
  let isProcessing = false; // Prevent overlapping processing

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.event === 'start') {
        callSid = data.start.callSid;
        processor = {
          buffer: [],
          process: async () => {
            if (isProcessing) return;
            isProcessing = true;
            
            try {
              const state = interviews.get(callSid);
              if (!state?.audioBuffer?.length) return;

              const wav = await convertAudio(Buffer.concat(state.audioBuffer));
              const text = await transcribeAudio(wav, callSid);
              state.history.push({ role: 'user', content: text });
              state.audioBuffer = [];
              await handleResponse(callSid, text);
            } catch (error) {
              console.error(`[${callSid}] Processing error:`, error);
            } finally {
              isProcessing = false;
            }
          }
        };
      }

      if (data.event === 'media' && processor) {
        const state = interviews.get(callSid);
        if (state) {
          state.audioBuffer.push(Buffer.from(data.media.payload, 'base64'));
          setTimeout(processor.process, 5000);
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (callSid) interviews.delete(callSid);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${callSid}:`, error);
  });
});

// Make Call Endpoint
app.post("/make-call", async (req, res) => {
  const { jobRole, jobDescription, candidates, scheduledTime, email } = req.body;
  
  try {
    // Validate candidates array
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Invalid candidates data" });
    }

    // Process each candidate
    const results = [];
    for (const candidate of candidates) {
      try {
        console.log(`Initiating call to ${candidate.phone}`);
        
        const call = await client.calls.create({
          to: candidate.phone, // Use candidate.phone instead of phoneNumber
          from: process.env.TWILIO_PHONE_NUMBER,
          twiml: `
            <Response>
              <Start>
                <Stream url="wss://${process.env.BACKEND_URL}/stream"/>
              </Start>
              <Say>Hello, please introduce yourself after the beep.</Say>
              <Play digits="9"/>
              <Pause length="5"/>
            </Response>`
        });

        // Initialize state for this call
        interviews.set(call.sid, {
          jobRole,
          jobDescription,
          history: [],
          phase: 'introduction',
          audioBuffer: [],
          candidatePhone: candidate.phone
        });

        results.push({ success: true, callSid: call.sid, phone: candidate.phone });
      } catch (error) {
        console.error(`Failed to call ${candidate.phone}:`, error);
        results.push({ success: false, phone: candidate.phone, error: error.message });
      }
    }

    res.json({ results });
    
  } catch (error) {
    console.error("Global call error:", error);
    res.status(500).json({ 
      error: "Call processing failed",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Process response endpoint
// In your handleResponse function
async function handleResponse(callSid, userText) {
  const state = interviews.get(callSid);
  if (!state) return;

  try {
    const call = await client.calls(callSid).fetch();
    if (call.status !== 'in-progress') return;

    const twiml = new twilio.twiml.VoiceResponse();
    
    // Always maintain WebSocket
    twiml.start().stream({ url: `wss://${process.env.BACKEND_URL}/stream` });

    // Phase Management
    switch (state.phase) {
      case 'introduction':
        state.phase = 'question1';
        twiml.say(await getAiResponse("Ask first technical question", state.jobRole, state.jobDescription));
        twiml.play({ digits: '9' });
        break;

      case 'question1':
        state.phase = 'question2';
        twiml.say(await getAiResponse("Ask second technical question", state.jobRole, state.jobDescription));
        twiml.play({ digits: '9' });
        break;

      case 'question2':
        state.phase = 'conclusion';
        twiml.say("Do you have any questions for me?");
        twiml.play({ digits: '9' });
        break;

      case 'conclusion':
        // Only end call after conclusion response
        twiml.say("Thank you for your time. Goodbye!");
        twiml.hangup();
        interviews.delete(callSid); // Cleanup
        break;
    }

    await call.update({ twiml: twiml.toString() });
  } catch (error) {
    console.error(`[${callSid}] Error:`, error);
    interviews.delete(callSid);
  }
}

app.post('/stream-action', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  logEvent(req.body.CallSid, 'stream_action_received', req.body);
  res.type('text/xml').send(twiml.toString());
});

app.post('/process-recording', async (req, res) => {
  const callSid = req.body.CallSid;
  logEvent(callSid, 'fallback_recording_triggered');
  
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Thank you for your response');
  res.type('text/xml').send(twiml.toString());
});

// Fetch scheduled calls
app.get("/scheduled-calls", async (req, res) => {
  const { email } = req.query;

  try {
    const scheduledCalls = await ScheduledCall.find({ email }).sort({ scheduledTime: -1 });
    res.status(200).json(scheduledCalls);
  } catch (error) {
    console.error(`Error fetching scheduled calls: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch scheduled calls", details: error.message });
  }
});

// Handle preflight requests
app.options('*', cors());

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});