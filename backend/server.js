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
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); // Initialize Twilio client
const allowedOrigins = [
  "http://localhost:3000",
  "https://moon-ai-one.vercel.app"
];

//conversation logger helper
function logConversation(callSid, speaker, text) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Call ${callSid}] [${speaker}]: ${text}`);
}

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

// Use your authentication routes
app.use('/', authRoutes);

// Add a route for the root URL
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

// Route to handle contact form submissions
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "adyatwr@gmail.com",  // Change this to your actual email
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

// Track interview state (in-memory storage; replace with a database in production)
const interviewState = new Map();

// Route to schedule and make calls
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

    const delay = scheduledDate.getTime() - now.getTime();

    // In your /make-call endpoint, modify the call creation:
    setTimeout(async () => {
      try {
        for (const candidate of candidates) {
          const initialPrompt = `Hi, I am moon, your AI interviewer for the ${jobRole} position. Can you start by introducing yourself?`;

          // Create call with initial TwiML
          const call = await client.calls.create({
            to: candidate.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `
          <Response>
            <Say>${initialPrompt}</Say>
            <Pause length="2"/>
            <Gather input="speech" action="${process.env.BACKEND_URL}/process-response" timeout="10"/>
          </Response>
        `,
          });

          const callSid = call.sid;

          // Set interview state immediately
          interviewState.set(callSid, {
            jobRole,
            jobDescription,
            conversationHistory: [{ role: "assistant", content: initialPrompt }],
            isIntroductionDone: false,
            inQnaPhase: false,
            questionCount: 0
          });

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

app.post('/process-response', async (req, res) => {
  const { SpeechResult, CallSid } = req.body;
  const callSid = req.body.CallSid || req.query.CallSid;

  try {
    if (!callSid) {
      throw new Error("Missing CallSid in request");
    }

    const state = interviewState.get(callSid);
    if (!state) {
      throw new Error(`No state found for CallSid: ${callSid}`);
    }

    let userResponse = SpeechResult;
    if (!userResponse) {
      const twiml = `
        <Response>
          <Say>I didn't hear anything. Please try again.</Say>
          <Gather input="speech" action="${process.env.BACKEND_URL}/process-response?CallSid=${callSid}" timeout="5">
            <Say>..</Say>
          </Gather>
        </Response>
      `;
      return res.type('text/xml').send(twiml);
    }

    state.conversationHistory.push({ role: "user", content: userResponse });

    let aiResponse;
    let shouldEndCall = false;
    let ratingData = null;

    // Check if we need to transition to Q&A phase
    if (state.questionCount >= 2 && !state.inQnaPhase) {
      state.inQnaPhase = true;
      aiResponse = "Thank you for your time. Do you have any questions for me?";
    } 
    // Handle Q&A phase
    else if (state.inQnaPhase) {
      // Check if user asked a question (simple detection)
      const isQuestion = /^(do|can|what|when|where|why|how|who|is|are|will|would|could)/i.test(userResponse.trim());
      
      if (isQuestion) {
        // Answer the question
        aiResponse = await getAiResponse(
          userResponse,
          state.jobRole,
          state.jobDescription,
          false,
          state.conversationHistory
        );
        aiResponse += " Thank you for your time. We'll get back to you soon.";
      } else {
        // No question asked
        aiResponse = "Thank you for your time. We'll get back to you soon.";
      }

      // Generate rating (not spoken to candidate)
      const ratingResponse = await getAiResponse(
        "Please provide rating for this candidate.",
        state.jobRole,
        state.jobDescription,
        true,
        state.conversationHistory
      );

      try {
        ratingData = JSON.parse(ratingResponse);
        console.log('Candidate Rating:', ratingData);
        
        // Save to database
        await ScheduledCall.updateOne(
          { 'candidates.phone': state.candidatePhone },
          { $set: { 
            'candidates.$.score': ratingData.score,
            'candidates.$.scoreJustification': ratingData.justification,
            'candidates.$.scoreBreakdown': ratingData.breakdown 
          }}
        );
      } catch (e) {
        console.error("Error parsing rating:", e);
      }

      shouldEndCall = true;
    } 
    // Normal interview flow
    else {
      aiResponse = await getAiResponse(
        userResponse,
        state.jobRole,
        state.jobDescription,
        false,
        state.conversationHistory
      );
      state.questionCount += 1;
    }

    state.conversationHistory.push({ role: "assistant", content: aiResponse });
    logConversation(callSid, 'AI', aiResponse);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(aiResponse);
    
    if (shouldEndCall) {
      twiml.hangup();
    } else {
      twiml.gather({
        input: 'speech',
        action: `${process.env.BACKEND_URL}/process-response?CallSid=${callSid}`,
        timeout: 5
      });
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error(`Error processing response: ${error.message}`);
    const twiml = `
      <Response>
        <Say>Sorry, an error occurred. Ending the call.</Say>
        <Hangup/>
      </Response>
    `;
    res.type('text/xml').send(twiml);
  }
});

// Fetch scheduled calls for the user
app.get("/scheduled-calls", async (req, res) => {
  const { email } = req.query;

  try {
    const scheduledCalls = await ScheduledCall.find({ email }).sort({ scheduledTime: -1 }); // Fetch calls sorted by date
    res.status(200).json(scheduledCalls);
  } catch (error) {
    console.error(`Error fetching scheduled calls: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch scheduled calls", details: error.message });
  }
});

// Handle preflight requests for all routes
app.options('*', cors());

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});