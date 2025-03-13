const express = require('express');
const connectDB = require('./db');
const passport = require('./config/passportConfig'); // Import Passport config
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Import Nodemailer

require('dotenv').config();

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  credentials: true, // Allow credentials (e.g., cookies, authorization headers)
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
  res.send('Backend server is running!');
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail as the email service
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email (from environment variables)
    pass: process.env.EMAIL_PASSWORD, // Your Gmail password or app password (from environment variables)
  },
});

// Route to handle contact form submissions
app.post('/send-email', (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender email
    to: 'adyatwr@gmail.com', // Your email (recipient)
    subject: 'New Message from Contact Form', // Email subject
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`, // Email body
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

// Handle preflight requests for all routes
app.options('*', cors()); // Enable preflight requests for all routes

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});