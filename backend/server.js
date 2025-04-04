const express = require('express');
const twilio = require('twilio');
const connectDB = require('./db');
const passport = require('./config/passportConfig');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const User = require("./models/user");
const ScheduledCall = require("./models/ScheduledCall");
const nodemailer = require('nodemailer');
require('dotenv').config();
const { transcribeAudio, getAiResponse } = require('./interview');
const { convertAudio} = require('./audioProcessor'); 
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
  maxPayload: 1024 * 1024, // 1MB
  verifyClient: (info, cb) => {
    cb(true, 200, 'OK', { 'Connection': 'Upgrade' });
  }
});
const interviewState = new Map();

app.use(express.json()); // This parses JSON bodies
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Connect to MongoDB
connectDB();

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Use authentication routes
app.use('/', authRoutes);

// Root URL route
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

// Contact form submissions
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "adyatwr@gmail.com",
    subject: "New Message from Moon AI Contact Form",
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});


wss.on('connection', (ws) => {
  let audioBuffer = [];
  let responseTimer = null;
  let isWaitingForResponse = false;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.start) {
        ws.callSid = data.start.callSid;
        return;
      }
      
      if (data.event === 'media') {
        audioBuffer.push(Buffer.from(data.media.payload, 'base64'));
        
        if (!isWaitingForResponse) {
          isWaitingForResponse = true;
          if (responseTimer) clearTimeout(responseTimer);
          
          responseTimer = setTimeout(async () => {
            if (audioBuffer.length > 0 && interviewState.has(ws.callSid)) {
              try {
                const combined = Buffer.concat(audioBuffer);
                const wavBuffer = await convertAudio(combined);
                const transcription = await transcribeAudio(wavBuffer, ws.callSid);
                
                const state = interviewState.get(ws.callSid);
                state.conversationHistory.push({
                  role: "user",
                  content: transcription
                });

                const call = await client.calls(ws.callSid).fetch();
                if (call.status !== 'completed') {
                  const twiml = new twilio.twiml.VoiceResponse();
                  
                  if (state.questionsAsked < 2) {
                    // Ask next question
                    const aiResponse = await getAiResponse(
                      transcription,
                      state.jobRole,
                      state.jobDescription,
                      false,
                      state.conversationHistory
                    );
                    state.questionsAsked++;
                    twiml.say({voice: 'woman'}, aiResponse);
                    twiml.play({digits: '9'});
                  } else if (!state.conclusionAsked) {
                    // Ask if user has questions
                    state.conclusionAsked = true;
                    twiml.say("Do you have any questions for me?");
                    twiml.play({digits: '9'});
                  } else {
                    // Handle user's response to conclusion question
                    if (transcription.toLowerCase().includes('yes')) {
                      const answer = await getAiResponse(
                        "Candidate asks: " + transcription,
                        state.jobRole,
                        state.jobDescription,
                        false,
                        state.conversationHistory
                      );
                      twiml.say(answer);
                    }
                    twiml.say("Thank you for your time. Goodbye.");
                    twiml.hangup();
                    interviewState.delete(ws.callSid);
                  }
                  
                  await call.update({twiml: twiml.toString()});
                }
              } catch (error) {
                console.error('Processing error:', error);
              }
            }
            audioBuffer = [];
            isWaitingForResponse = false;
          }, 5000); // 5 seconds to respond
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    if (responseTimer) clearTimeout(responseTimer);
  });
});

// Schedule and make calls
app.post("/make-call", async (req, res) => {
  const { jobRole, jobDescription, candidates, scheduledTime, email } = req.body;

  try {
    if (!jobRole || !jobDescription || !candidates || !scheduledTime || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const now = new Date();
    const scheduledDate = new Date(scheduledTime);

    if (scheduledDate <= now) {
      return res.status(400).json({ error: "Scheduled time must be in the future" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.usedCalls + candidates.length > user.totalCalls) {
      return res.status(403).json({
        error: "Not enough remaining calls in your plan",
        remaining: user.totalCalls - user.usedCalls,
        required: candidates.length
      });
    }

    user.usedCalls += candidates.length;
    user.totalCallsTillDate += candidates.length;
    await user.save();

    const scheduledCall = new ScheduledCall({
      jobRole,
      jobDescription,
      candidates,
      scheduledTime: scheduledDate,
      email,
    });
    await scheduledCall.save();
    console.log("WebSocket URL:", `wss://${process.env.BACKEND_URL}/stream`);

    const delay = scheduledDate.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        for (const candidate of candidates) {
          const call = await client.calls.create({
            to: candidate.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `<Response>
              <Say voice="woman">Hello, please introduce yourself after the beep</Say>
              <Play digits="9"/>
              <Start>
                <Stream url="wss://${process.env.BACKEND_URL}/stream"/>
              </Start>
              <Pause length="30"/>
            </Response>`
          });

          interviewState.set(call.sid, {
            jobRole,
            jobDescription,
            conversationHistory: [],
            candidatePhone: candidate.phone,
            questionsAsked: 0,
            conclusionAsked: false
          });
        }
      } catch (error) {
        console.error('Error initiating calls:', error.message);
      }
    }, delay);

    res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      scheduledTime: scheduledDate.toISOString(),
      candidatesCount: candidates.length,
      remainingCalls: user.totalCalls - user.usedCalls
    });
  } catch (error) {
    console.error(`Error scheduling call: ${error.message}`);
    res.status(500).json({
      error: "Failed to schedule call",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Process response endpoint
app.post('/process-response', async (req, res) => {
  console.log('\n=== RAW REQUEST BODY ===\n', req.body);
  
  try {
    if (!req.body?.callSid || !req.body?.transcription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { transcription, callSid } = req.body;
    const twiml = new twilio.twiml.VoiceResponse();

    const state = interviewState.get(callSid) || {
      jobRole: 'default',
      jobDescription: '',
      conversationHistory: []
    };

    state.conversationHistory.push({ role: "user", content: transcription });
    
    const aiResponse = await getAiResponse(
      transcription,
      state.jobRole,
      state.jobDescription,
      false,
      state.conversationHistory
    );

    // Ensure valid TwiML response
    twiml.say({
      voice: 'woman',
      language: 'en-US'
    }, aiResponse.substring(0, 1000)); // Limit length
    
    twiml.redirect({
      method: 'POST'
    }, `wss://${process.env.BACKEND_URL}/stream`);

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('PROCESS-RESPONSE ERROR:', error);
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.say('We encountered an error. Please try again later.');
    res.type('text/xml').send(errorTwiml.toString());
  }
});

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