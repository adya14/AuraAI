const { getInterviewPrompt } = require('./prompt');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { PassThrough } = require('stream');
const fs = require('fs');
const { Readable } = require('stream');
const path = require('path');
const wav = require('wav');

const RECORDINGS_DIR = './call_recordings';
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

async function transcribeAudio(buffer, callSid) {
  try {
    const wavBuffer = convertToWav(buffer);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${callSid}_${timestamp}.wav`;
    const filepath = path.join(RECORDINGS_DIR, filename);

    // Save recording
    fs.writeFileSync(filepath, wavBuffer);
    console.log(`[Recording Saved] ${filepath}`);

    // Transcribe using Whisper with higher accuracy settings
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: "whisper-1",
      response_format: "text",
      temperature: 0.2,  // Lower temperature for more accurate results
      language: "en"     // Explicitly set language if known
    });

    return response;
  } catch (error) {
    console.error('Transcription failed:', error.message);
    throw new Error('Could not transcribe audio');
  }
}

// Helper to convert Blob to ReadStream
function toReadStream(blob) {
  const stream = new PassThrough();
  stream.end(Buffer.from(blob));
  return stream;
}

const convertToWav = (buffer) => {
  const wavHeaderSize = 44;
  const totalSize = buffer.length + wavHeaderSize - 8;
  
  const header = Buffer.alloc(wavHeaderSize);
  header.write('RIFF', 0);
  header.writeUInt32LE(totalSize, 4); 
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000 * 1 * 16/8, 28);
  header.writeUInt16LE(1 * 16/8, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(buffer.length, 40);
  
  return Buffer.concat([header, buffer]);
};

async function getAiResponse(text, role, jobDescription, requestRating = false, conversationHistory = []) {
  try {
    const messages = getInterviewPrompt(role, jobDescription);

    if (conversationHistory) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: "user", content: text });

    if (requestRating) {
      messages.push({
        role: "system",
        content: `Generate a JSON rating object with these fields:
        - score (1-10)
        - justification (string)
        - breakdown (array of {category, score, comment})
        
        Example response:
        {
          "score": 7,
          "justification": "Candidate showed good technical skills but lacked depth in...",
          "breakdown": [
            {"score": 8, "comment": "Strong fundamentals..."},
          ]
        }`
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      response_format: requestRating ? { type: "json_object" } : undefined
    });

    return requestRating 
      ? response.choices[0].message.content
      : response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  getAiResponse,
};