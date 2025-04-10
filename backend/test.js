// audioUtils.js
require('dotenv').config();
const axios = require('axios');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Downloads and transcribes audio from Twilio URL
 * @param {string} recordingUrl - Twilio recording URL
 * @param {string} callSid - For logging/temp files
 * @returns {Promise<string>} Transcription text
 */
async function transcribeRecording(recordingUrl, callSid, retries = 3, delayMs = 2000) {
  const tempDir = path.join(__dirname, 'call_recordings');
  
  try {
    // 1. Create temp directory if needed
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // 2. Download with retry logic
    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${callSid}] Download attempt ${attempt}/${retries}`);
        response = await axios({
          method: 'get',
          url: recordingUrl,
          responseType: 'stream',
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
          },
          timeout: 30000
        });
        break; // Success - exit retry loop
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // 3. Process the successful download
    const tempFilePath = path.join(tempDir, `${callSid}_${Date.now()}.wav`);
    await new Promise((resolve, reject) => {
      response.data.pipe(fs.createWriteStream(tempFilePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    // 4. Transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
      language: "en"
    });

    // 5. Cleanup
    fs.unlink(tempFilePath, () => {});
    return transcription;

  } catch (error) {
    // Final cleanup if error occurred mid-process
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      if (file.includes(callSid)) {
        fs.unlink(path.join(tempDir, file), () => {});
      }
    });
    throw error;
  }
}

module.exports = { transcribeRecording };