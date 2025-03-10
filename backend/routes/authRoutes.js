const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const passport = require('passport');
require('../config/passportConfig');
require('dotenv').config();

const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({email});

    if (existingUser){
      return res.status(400).json({error: "Account already exists with this email. Please log in using your Google account"});
    }
    const user = new User({ firstName, lastName, email, password });
    await user.save();

    // Generate a token with userId in the payload
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { firstName, lastName, email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    if(!user.password){
      return res.status(400).json({error: "The account was created using Google. Please log in using Google."});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    // Generate a token with userId in the payload
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { firstName: user.firstName, lastName: user.lastName, email: user.email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Google Auth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google OAuth Callback Error:", err);
      return res.redirect(`http://localhost:3000?error=Server error`);
    }

    if (!user) {
      console.error("Google OAuth Failed:", info?.message || "Unknown reason");
      return res.redirect(`http://localhost:3000?error=${encodeURIComponent(info?.message || "Authentication failed")}`);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.redirect(`http://localhost:3000?token=${token}`);
  })(req, res, next);
});


// Profile Route (Protected by JWT)
router.get('/api/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // console.log('Authenticated using:', req.user._id); 

    // Fetch the user's profile information from the database
    const user = await User.findById(req.user._id).select('-password'); // Exclude the password field
    if (!user) {
      // console.log('User not found'); 
      return res.status(404).json({ error: 'User not found' });
    }

    // console.log('User data:', user); 
    res.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error); 
    res.status(500).json({ error: error.message });
  }
});

// Delete user profile
router.delete('/api/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;