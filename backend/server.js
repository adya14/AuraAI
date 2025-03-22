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
app.post('/send-email', (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'moon.voice.ai@gmail.com',
    subject: 'New Message from moonAI Contact Form',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: 'Failed to send email.' });
    } else {
      console.log('Email sent:', info.response);
      res.status(200).json({ success: true, message: 'Email sent successfully!' });
    }
  });
});

// Track interview state (in-memory storage; replace with a database in production)
const interviewState = new Map();

// Route to schedule and make a Twilio call at the specified time
app.post("/make-call", async (req, res) => {
  const { jobRole, jobDescription, candidates, scheduledTime, email } = req.body;

  try {
    console.log("Attempting to schedule a call...");

    // Log the received data for debugging
    console.log("Job Role:", jobRole);
    console.log("Job Description:", jobDescription);
    console.log("Candidates:", candidates);
    console.log("Scheduled Time:", scheduledTime);
    console.log("Email:", email); 

    const now = new Date();
    const scheduledDate = new Date(scheduledTime);

    // Validate the scheduled time
    if (scheduledDate <= now) {
      throw new Error("Scheduled time must be in the future.");
    }

    // Save the scheduled call to the database
    const scheduledCall = new ScheduledCall({
      jobRole,
      jobDescription,
      candidates,
      scheduledTime: scheduledDate,
      email, // Link the call to the user
    });

    await scheduledCall.save();

    // Schedule the call using Twilio (your existing logic)
    const delay = scheduledDate.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const call = await client.calls.create({
          to: candidates[0].phone, // Use the first candidate's phone number
          from: process.env.TWILIO_PHONE_NUMBER,
          twiml: `
            <Response>
              <Say>Hi, I am moon, your AI interviewer for the ${jobRole} position. Can you start by introducing yourself?</Say>
              <Gather input="speech" action="${process.env.NGROK_URL}/process-response" timeout="10">
              </Gather>
            </Response>
          `,
        });

        if (!call.sid) {
          throw new Error("Twilio call SID is undefined. Call creation may have failed.");
        }

        console.log(`Call initiated. Call SID: ${call.sid}`);
      } catch (error) {
        console.error(`Error initiating call: ${error.message}`);
      }
    }, delay);

    res.status(200).json({ message: "Call scheduled successfully", scheduledTime });
  } catch (error) {
    console.error(`Error scheduling call: ${error.message}`);
    res.status(500).json({ error: "Failed to schedule call", details: error.message });
  }
});

// Route to process user speech input
app.post('/process-response', async (req, res) => {
  const { SpeechResult, CallSid } = req.body;

  try {
    console.log("Request Body:", req.body); // Log the entire request body for debugging

    if (!CallSid) {
      throw new Error("Missing CallSid.");
    }

    console.log(`Processing response for CallSid: ${CallSid}`);

    // Get the interview state for this call
    const state = interviewState.get(CallSid);

    if (!state) {
      throw new Error("Invalid CallSid.");
    }

    // Handle missing SpeechResult
    if (!SpeechResult) {
      console.log("No speech detected. Prompting the user to speak again.");
      const twiml = `
        <Response>
          <Say>I didn't hear anything. Please try again.</Say>
          <Gather input="speech" action="${process.env.NGROK_URL}/process-response" timeout="5">
            <Say>..</Say>
          </Gather>
        </Response>
      `;
      res.type('text/xml').send(twiml);
      return;
    }

    // Add user input to conversation history
    state.conversationHistory.push({ role: "user", content: SpeechResult });

    // Check if this is the first interaction
    if (!state.isIntroductionDone) {
      state.isIntroductionDone = true;
      const aiResponse = "I'm your interviewer today. Let's start with your introduction.";
    } else {
      // Check if we need to transition to Q&A phase
      if (state.questionCount >= 2 && !state.inQnaPhase) {
        state.inQnaPhase = true;
        const aiResponse = "Thank you for your time. Do you have any questions for me?";
      } else if (state.inQnaPhase) {
        // Generate final response and end the call
        const aiResponse = await getAiResponse(
          SpeechResult,
          state.jobRole, // Use job role from state
          state.jobDescription, // Use job description from state
          true, // Request rating
          state.conversationHistory
        );
        const twiml = `
          <Response>
            <Say>${aiResponse}</Say>
            <Hangup />
          </Response>
        `;
        res.type('text/xml').send(twiml);
        return;
      } else {
        // Generate the next question
        const aiResponse = await getAiResponse(
          SpeechResult,
          state.jobRole, // Use job role from state
          state.jobDescription, // Use job description from state
          false, // Don't request rating
          state.conversationHistory
        );
        state.questionCount += 1;
      }
    }

    // Add AI response to conversation history
    state.conversationHistory.push({ role: "assistant", content: aiResponse });

    // Build TwiML response
    const twiml = `
      <Response>
        <Say>${aiResponse}</Say>
        <Gather input="speech" action="${process.env.NGROK_URL}/process-response" timeout="5">
          <Say>Please continue.</Say>
        </Gather>
      </Response>
    `;

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error(`Error processing response: ${error.message}`);
    const twiml = `
      <Response>
        <Say>Sorry, an error occurred.</Say>
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

app.get("/user-plan", async (req, res) => {
  const { email } = req.query;

  try {
    // Fetch user's active plan and call usage from the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      activePlan: user.activePlan || null,
      totalCalls: user.totalCalls || 0,
      usedCalls: user.usedCalls || 0,
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle preflight requests for all routes
app.options('*', cors());

// Catch-all route to serve the frontend
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
// });

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});