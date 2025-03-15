const express = require('express');
const twilio = require('twilio'); // Import Twilio SDK
const connectDB = require('./db');
const passport = require('./config/passportConfig');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { transcribeAudio, getAiResponse } = require('./interview');
const app = express();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); // Initialize Twilio client

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
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
    to: 'adyatwr@gmail.com',
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

// Route to trigger Twilio call
app.post('/make-call', async (req, res) => {
  const { jobRole, jobDescription, recipientPhoneNumber } = req.body;

  try {
    console.log("Attempting to make a call...");

    // Log the received data for debugging
    console.log("Job Role:", jobRole);
    console.log("Job Description:", jobDescription);
    console.log("Recipient Phone Number:", recipientPhoneNumber);

    const call = await client.calls.create({
      to: recipientPhoneNumber, // Use the phone number from the frontend
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `
        <Response>
          <Say>Hi, I am moon, your AI interviewer for the ${jobRole} position. Can you start by introducing yourself?</Say>
          <Gather input="speech" action="${process.env.NGROK_URL}/process-response" timeout="10">
            <Say>Hi, I am moon, your AI interviewer. Let's begin. Please introduce yourself.</Say>
          </Gather>
        </Response>
      `,
    });

    if (!call.sid) {
      throw new Error("Twilio call SID is undefined. Call creation may have failed.");
    }

    // Initialize state for this call
    interviewState.set(call.sid, {
      conversationHistory: [],
      questionCount: 0,
      inQnaPhase: false,
      isIntroductionDone: true,
      jobRole, // Store job role in state
      jobDescription, // Store job description in state
    });

    console.log(`Call initiated. Call SID: ${call.sid}`);
    res.status(200).json({ message: "Call initiated", call_sid: call.sid });
  } catch (error) {
    console.error(`Error making call: ${error.message}`);
    res.status(500).json({ error: "Failed to trigger call", details: error.message });
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

// Handle preflight requests for all routes
app.options('*', cors());

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});