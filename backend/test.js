const express = require('express');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));

// Test endpoint to initiate call
app.post('/initiate-call', (req, res) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  client.calls.create({
    to: req.body.toNumber,  // Your phone number
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `https://${process.env.BACKEND_URL}/dtmf-twiml`
  })
  .then(call => {
    res.json({ 
      status: 'Call initiated', 
      sid: call.sid 
    });
  })
  .catch(err => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
});

// TwiML for DTMF test
app.post('/dtmf-twiml', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say('Welcome to DTMF test. Press any key on your keypad.');
  
  twiml.gather({
    input: 'dtmf',
    timeout: 10,
    numDigits: 1,
    action: '/dtmf-handler'
  });

  res.type('text/xml').send(twiml.toString());
});

// Handle DTMF input
app.post('/dtmf-handler', (req, res) => {
  console.log('DTMF Received:', req.body.Digits);
  
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(`You pressed ${req.body.Digits}. Test successful. Goodbye.`);
  res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`DTMF Test Server running on port ${PORT}`);
});