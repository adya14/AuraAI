const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  verificationCode: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true }, // For Google OAuth users
  plan: { type: String, default: 'No active plan' }, // Example: Free, Premium, etc.
  otp: { type: String }, // Add this field
  otpExpiry: { type: Date }, // Add this field
});

// Hash the password before saving the user (only if the password is modified)
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);