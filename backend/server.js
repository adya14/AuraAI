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
const { PassThrough } = require('stream');

// Create WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server, path: '/stream' });

// Conversation logger helper
function logConversation(callSid, speaker, text) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Call ${callSid}] [${speaker}]: ${text}`);
}

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/process-response') {
    console.log('Incoming callSid:', req.body.callSid);
    console.log('Current states:', Array.from(interviewState.keys()));
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

  // Heartbeat tracking
  ws.isAlive = true;
  ws.on('pong', () => { 
    ws.isAlive = true;
    console.log(`[HB] ${callSid || 'unknown'} alive`);
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      callSid = data.start?.callSid || data.callSid || data.stop?.callSid;
      
      // Log event type without media spam
      if (data.event !== 'media') {
        console.log(`[WS ${data.event}] ${callSid || 'unknown'}`);
      }

      // Bind callSid to connection
      if (callSid && !ws.callSid) {
        ws.callSid = callSid;
        console.log(`Call ${callSid} bound to WS`);
      }

      // Handle media events
      if (data.event === 'media') {
        const audio = Buffer.from(data.media.payload, 'base64');
        
        // Skip silent audio
        if (!isSilentAudio(data.media.payload)) {
          audioBuffer.push(audio);
          
          if (!isSpeaking) {
            isSpeaking = true;
            console.log(`[Speech Start] ${callSid}`);
          }

          // Reset silence timer
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(async () => {
            if (isSpeaking) {
              isSpeaking = false;
              console.log(`[Speech End] ${callSid}`);
              
              try {
                const combinedAudio = Buffer.concat(audioBuffer);
                const transcription = await transcribeAudio(combinedAudio);
                console.log(`[Transcript] ${callSid}:`, transcription);
                
                // Process response
                if (callSid && interviewState.has(callSid)) {
                  const state = interviewState.get(callSid);
                  // ... your response handling logic ...
                }
              } catch (error) {
                console.error(`[Transcribe Error] ${callSid}:`, error);
              }
              
              audioBuffer = [];
            }
          }, 1000); // 1s silence threshold
        }
      }
      
    } catch (error) {
      console.error('[WS Error]', error.message);
    }
  });

  ws.on('close', () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    console.log(`[WS Closed] ${callSid || 'unknown'}`);
  });
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
function isSilentAudio(payload) {
  return payload.startsWith('/v7+/') || 
         payload.includes('////////////////////////////////////////////////////////////////');
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
          const initialPrompt = `Hi, I am moon, your AI interviewer for the ${jobRole} position. Can you start by introducing yourself?`;

          const call = await client.calls.create({
            to: candidate.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `
              <Response>
                <Say voice="woman" language="en-US">
                  Connecting you to your interview now...
                </Say>
                <Connect timeout="60">
                  <Stream url="wss://${process.env.BACKEND_URL}/stream"/>
                </Connect>
              </Response>
            `
          });

          const callSid = call.sid;
          interviewState.set(callSid, {
            jobRole,
            jobDescription,
            conversationHistory: [{ role: "assistant", content: initialPrompt }],
            isIntroductionDone: false,
            inQnaPhase: false,
            questionCount: 0,
            candidatePhone: candidate.phone
          });
          console.log(`[STATE SAVED] CallSid: ${callSid}`);
          console.log(`[CURRENT STATES]`, Array.from(interviewState.keys()));
          logConversation(callSid, 'AI', initialPrompt);
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
  const { transcription, callSid } = req.body;
  const twiml = new twilio.twiml.VoiceResponse();

  console.log('\n=== NEW PROCESS-RESPONSE REQUEST ===');
  console.log('Current States:', Array.from(interviewState.keys()));
  console.log('Incoming callSid:', callSid);

  try {
    // Validate input
    if (!callSid?.match(/^CA[0-9a-f]{32}$/i)) {
      throw new Error(`Invalid callSid format: ${callSid}`);
    }

    // Get or create state (temporary fallback)
    const state = interviewState.get(callSid);
    if (!state) {
      throw new Error(`No state found for ${callSid}. Active calls: ${Array.from(interviewState.keys())}`);
    }
    if (!state) {
      console.warn('State not found, creating temporary state');
      state = {
        jobRole: 'fallback-role',
        jobDescription: 'fallback-description',
        conversationHistory: []
      };
    }

    // Process conversation
    state.conversationHistory.push({ role: "user", content: transcription });
    
    const aiResponse = String(await getAiResponse(
      transcription,
      state.jobRole,
      state.jobDescription,
      false,
      state.conversationHistory
    )).trim();

    state.conversationHistory.push({ role: "assistant", content: aiResponse });

    // Generate TwiML
    twiml.say({
      voice: 'woman',
      language: 'en-US'
    }, aiResponse);

    twiml.connect().stream({
      url: `wss://${process.env.BACKEND_URL}/stream`
    });

    console.log('Generated TwiML:', twiml.toString());

  } catch (error) {
    console.error('Error:', error.message);
    twiml.say('We encountered a technical difficulty. Goodbye.');
    twiml.hangup();
  }

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