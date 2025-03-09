const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
require('dotenv').config();

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      const existingUser = await User.findOne({email: profile.emails[0].value});
      if (existingUser){
        return done(null, false, {message: "Account already exists. Please log in with email and password."});
      }
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
      });
      await user.save();
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from the Authorization header
  secretOrKey: process.env.JWT_SECRET, // Use your JWT secret from environment variables
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // console.log('JWT payload:', payload); 
      if (!payload.userId) {
        console.error('User ID not found in JWT payload'); 
        return done(null, false);
      }

      // Find the user by ID from the JWT payload
      const user = await User.findById(payload.userId);
      if (!user) {
        console.error('User not found in database'); 
        return done(null, false); // User not found
      }

      // console.log('Authenticated user:', user); 
      return done(null, user); // User found
    } catch (error) {
      console.error('Error in JWT strategy:', error); 
      return done(error, false); // Error occurred
    }
  })
);

module.exports = passport;