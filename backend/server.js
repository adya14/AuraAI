const express = require('express');
const connectDB = require('./db');
const passport = require('passport');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors'); // Import the cors package

require('dotenv').config();

const app = express();

app.use(cors());

// Connect to MongoDB
connectDB();

// Middleware to parse JSON requests
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Use your authentication routes
app.use('/api', authRoutes);

// Add a route for the root URL
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});