const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
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
// Replace your WebSocket server creation with:
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

const VAD = require('node-vad');
const vad = new VAD(VAD.Mode.NORMAL);

// Add this near the top of server.js
function logEvent(callSid, event, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    callSid: callSid || 'unknown',
    event,
    ...data
  };
  console.log('\n===', event.toUpperCase(), '===');
  console.log(JSON.stringify(logEntry, null, 2));
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

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  // Connection state
  ws.isAlive = true;
  ws.callSid = null;
  ws._socket.setNoDelay(true);
  ws._socket.setKeepAlive(true, 30000);
  
  // Audio collection state
  let audioBuffer = [];
  let isRecording = false;
  
  // Heartbeat setup
  const heartbeatInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log(`Terminating dead connection: ${ws.callSid || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, 15000);

  // Message Handler - Fixed 5-second collection
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.start) {
        // Initialize new call
        ws.callSid = data.start.callSid;
        isRecording = true;
        audioBuffer = [];
        logEvent(ws.callSid, 'call_started');
        
        // Clear any existing timeout
        if (ws.recordingTimeout) clearTimeout(ws.recordingTimeout);
        
        // Set 5-second timeout for audio processing
        ws.recordingTimeout = setTimeout(() => {
          if (audioBuffer.length > 0) {
            const chunksToProcess = [...audioBuffer];
            audioBuffer = [];
            processAudioBuffer(chunksToProcess, ws.callSid);
          }
          isRecording = false;
        }, 5000);
        return;
      }
      
      if (data.event === 'media' && isRecording) {
        const audio = Buffer.from(data.media.payload, 'base64');
        audioBuffer.push(audio);
      }
    } catch (error) {
      logEvent(ws.callSid, 'ws_message_error', {
        error: error.message
      });
    }
  });

  // Heartbeat response
  ws.on('pong', () => {
    ws.isAlive = true;
    logEvent(ws.callSid, 'heartbeat_received');
  });

  // Connection cleanup
  ws.on('close', () => {
    clearInterval(heartbeatInterval);
    if (ws.recordingTimeout) clearTimeout(ws.recordingTimeout);
    logEvent(ws.callSid, 'ws_connection_closed');
  });

  // Error handling
  ws.on('error', (error) => {
    logEvent(ws.callSid, 'ws_error', {
      error: error.message
    });
  });
});

// Ping all clients every 30s to check connection health
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.callSid || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = true;
    ws.ping();
  });
}, 30000);

// Ping all clients every 30s to check connection health
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.callSid || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = true;
    ws.ping();
  });
}, 30000);

app.get('/connection-status', (req, res) => {
  res.json({
    activeConnections: wss.clients.size,
    connections: Array.from(wss.clients).map(ws => ({
      callSid: ws.callSid,
      alive: ws.isAlive,
      bufferedAmount: ws.bufferedAmount
    }))
  });
});
// Helper function to process the accumulated audio
async function processAudioBuffer(buffer, callSid) {
  if (!buffer || buffer.length === 0) {
    logEvent(callSid, 'empty_audio_skipped');
    return;
  }

  try {
    logEvent(callSid, 'audio_processing_started', {
      bufferSize: buffer.length,
      estimatedDuration: '5000ms (fixed)'
    });

    // Combine all chunks
    const combined = Buffer.concat(buffer);

    // Convert to WAV
    const wavBuffer = await convertAudio(combined).catch(async (err) => {
      logEvent(callSid, 'conversion_fallback', {
        error: err.message,
        usingRaw: true
      });
      return combined; // Fallback to raw audio
    });

    // Save for debugging
    const filename = `${callSid}_${Date.now()}.wav`;
    fs.writeFileSync(filename, wavBuffer);
    logEvent(callSid, 'audio_saved', { filename });

    // Transcribe
    const transcription = await transcribeAudio(wavBuffer, callSid);
    logEvent(callSid, 'transcription_complete', {
      textLength: transcription.length,
      firstWords: transcription.substring(0, 50) + '...'
    });

    // Process with AI if call is active
    if (interviewState.has(callSid)) {
      const state = interviewState.get(callSid);
      state.conversationHistory.push({
        role: "user",
        content: transcription
      });

      const aiResponse = await getAiResponse(
        transcription,
        state.jobRole,
        state.jobDescription,
        false,
        state.conversationHistory
      );

      // Send response
      try {
        const call = await client.calls(callSid).fetch();
        if (call.status !== 'completed') {
          const twiml = new twilio.twiml.VoiceResponse();
          twiml.say({
            voice: 'woman',
            language: 'en-US'
          }, aiResponse.substring(0, 1000));
          await call.update({ twiml: twiml.toString() });
          logEvent(callSid, 'response_sent');
        }
      } catch (twilioError) {
        logEvent(callSid, 'call_update_failed', {
          error: twilioError.message
        });
      }
    }
  } catch (error) {
    logEvent(callSid, 'processing_error', {
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
  }
}

// Ping all clients every 30s
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.callSid || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = true; // Reset FIRST
    ws.ping(); // Then ping
  });
}, 30000); // Increase to 30 seconds

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
            twiml: 
            `<Response>
  <Start>
    <Stream 
      url="wss://${process.env.BACKEND_URL}/stream"
      track="inbound_track"
      statusCallback="https://${process.env.BACKEND_URL}/stream-events"
      statusCallbackEvent="start stop"
      connectTimeout="10"
      inactivityTimeout="30"
      action="https://${process.env.BACKEND_URL}/stream-action"
    />
  </Start>
  <Say voice="woman" loop="1">Hello, please introduce yourself after the beep</Say>
  <Play digits="9"/> <!-- Beep sound -->
  <Record 
    action="https://${process.env.BACKEND_URL}/process-recording"
    timeout="10"
    playBeep="false"
  />
</Response>`
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
app.post('/stream-action', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  logEvent(req.body.CallSid, 'stream_action_received', req.body);
  res.type('text/xml').send(twiml.toString());
});
// Fallback recording handler
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