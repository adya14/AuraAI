// models/ScheduledCall.js
const mongoose = require("mongoose");

const ScheduledCallSchema = new mongoose.Schema({
  jobRole: { type: String, required: true },
  jobDescription: { type: String, required: true },
  candidates: [
    {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
  ],
  scheduledTime: { type: Date, required: true },
  email: { type: String, required: true }, 
});

module.exports = mongoose.model("ScheduledCall", ScheduledCallSchema);