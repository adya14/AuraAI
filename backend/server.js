const express = require('express');
const connectDB = require('./db');
const passport = require('./config/passportConfig'); // Import Passport config
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');

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

// Handle preflight requests for all routes
app.options('*', cors()); // Enable preflight requests for all routes

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});