const express = require('express');
const twilio = require('twilio');
const path = require('path');
const connectDB = require('./db');
const passport = require('./config/passportConfig');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const User = require("./models/user");
const ScheduledCall = require("./models/ScheduledCall");
const nodemailer = require('nodemailer');
require('dotenv').config();
const { transcribeAudio, getAiResponse } = require('./interview');
const app = express();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const allowedOrigins = [
  "http://localhost:3000",
  "https://moon-ai-one.vercel.app"
];
const WebSocket = require('ws');

// Create WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server, path: '/stream' });
const fs = require('fs');

// Conversation logger helper
function logConversation(callSid, speaker, text) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Call ${callSid}] [${speaker}]: ${text}`);
}
app.use(express.json()); // This parses JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/process-response') {
    console.log('Incoming callSid:', req.body.callSid);
    console.log('Current states:', Array.from(interviewState.keys()));
    console.log('Incoming request body:', req.body);
  }
  next();
});

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

// Persistent state storage
if (!global.interviewState) {
  global.interviewState = new Map();
  console.log('Initialized new interviewState Map');
}
const interviewState = global.interviewState;

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('\n=== NEW WEBSOCKET CONNECTION ===');
  let callSid = null;
  let audioBuffer = [];
  let isSpeaking = false;
  let silenceTimer = null;
  const SPEECH_END_TIMEOUT = 1000;
  const MIN_AUDIO_LENGTH = 8000;

  // Track connection health
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Properly handle call start/stop events
      if (data.start) {
        callSid = data.start.callSid;
        ws.callSid = callSid; // Attach to WebSocket object
        console.log(`[Call Started] ${callSid}`);
        return;
      }
      
      if (data.stop) {
        console.log(`[Call Ended] ${callSid}`);
        return ws.close();
      }

      // Only process media if we have a callSid
      if (data.event === 'media' && callSid) {
        const audio = Buffer.from(data.media.payload, 'base64');
        
        if (!isSilentAudio(audio)) {
          audioBuffer.push({
            timestamp: Date.now(),
            data: audio
          });
          
          if (!isSpeaking) {
            isSpeaking = true;
            console.log(`[Speech Start] ${callSid}`);
          }

          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(async () => {
            if (isSpeaking) {
              isSpeaking = false;
              console.log(`[Speech End] ${callSid}`);
              await processUserSpeech();
            }
          }, SPEECH_END_TIMEOUT);
        }
      }
    } catch (error) {
      console.error('[WS Error]', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`[Connection Closed] ${callSid || 'unknown'}`);
    if (silenceTimer) clearTimeout(silenceTimer);
  });

  async function processUserSpeech() {
    if (!audioBuffer.length || !callSid) return;
    
    try {
      audioBuffer.sort((a, b) => a.timestamp - b.timestamp);
      const combinedAudio = Buffer.concat(audioBuffer.map(b => b.data));
      
      if (combinedAudio.length < MIN_AUDIO_LENGTH) {
        console.log(`[Too Short] Skipping ${combinedAudio.length} byte buffer`);
        audioBuffer = [];
        return;
      }

      console.log(`[Processing] ${callSid} - ${combinedAudio.length} bytes`);
      const transcription = await transcribeAudio(combinedAudio, callSid);
      
      if (interviewState.has(callSid)) {
        const state = interviewState.get(callSid);
        state.conversationHistory.push({ role: "user", content: transcription });
        
        const aiResponse = await getAiResponse(
          transcription,
          state.jobRole,
          state.jobDescription,
          false,
          state.conversationHistory
        );
        
        ws.send(JSON.stringify({
          event: 'ai_response',
          text: aiResponse,
          callSid: callSid
        }));
      }
    } catch (error) {
      console.error(`[Processing Error] ${callSid}:`, error.message);
    } finally {
      audioBuffer = [];
    }
  }
});

// Ping all clients every 15s
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.callSid || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

// Helper to detect silent audio
function isSilentAudio(buffer) {
  // Check if buffer is mostly zeros (silence)
  const silentThreshold = 0.01;
  let sum = 0;
  
  for (let i = 0; i < buffer.length; i++) {
    sum += Math.abs(buffer[i] - 128);
  }
  
  const avg = sum / buffer.length;
  return avg < silentThreshold || 
         buffer.length < 100; // Very short buffers
}

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
            twiml: `
              <Response>
                <Connect>
                  <Stream url="wss://${process.env.BACKEND_URL}/stream">
                    <Parameter name="audioCodec" value="opus"/> 
                    <Parameter name="audioSampleRate" value="16000"/>
                    <Parameter name="enableTrack" value="inbound"/>
                  </Stream>
                </Connect>
              </Response>
            `
          });

          const callSid = call.sid;
          interviewState.set(callSid, {
            jobRole,
            jobDescription,
            conversationHistory: [], // Empty initial history
            candidatePhone: candidate.phone
          });
          console.log(`Call initiated to ${candidate.phone}. SID: ${callSid}`);
        }
      } catch (error) {
        console.error(`Error initiating calls: ${error.message}`);
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