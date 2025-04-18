// models/ScheduledCall.js
const mongoose = require("mongoose");

// models/ScheduledCall.js
const ScheduledCallSchema = new mongoose.Schema({
  jobRole: { type: String, required: true },
  jobDescription: { type: String, required: true },
  candidates: [
    {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      score: { type: Number },
      scoreJustification: { type: String },
      scoreBreakdown: [
        {
          category: String,
          score: Number,
          comment: String
        }
      ],
      transcript: { type: String }
    }
  ],
  scheduledTime: { type: Date, required: true },
  email: { type: String, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'processing', 'completed', 'failed'],
    default: 'scheduled'
  }
});

module.exports = mongoose.model("ScheduledCall", ScheduledCallSchema);