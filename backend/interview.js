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

const { convertAudio } = require('./audioProcessor');

async function transcribeAudio(buffer, callSid) {
  try {
    // Convert audio first
    const wavBuffer = await convertAudio(buffer);
    
    const filename = `${callSid}_${Date.now()}.wav`;
    const filepath = path.join(RECORDINGS_DIR, filename);
    
    // Save recording
    fs.writeFileSync(filepath, wavBuffer);
    
    // Transcribe
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: "whisper-1",
      response_format: "text",
      temperature: 0.2,
      language: "en"
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
  try {
    // First, try to determine the actual audio format from the buffer
    // If buffer already has a WAV header, extract the parameters
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && 
        buffer.toString('ascii', 8, 12) === 'WAVE') {
      // It's already a WAV file, return as-is
      return buffer;
    }

    // Default to Twilio's typical stream format if unknown:
    // 8kHz, 16-bit, mono (µ-law PCM)
    const sampleRate = 8000;
    const channels = 1;
    const bitDepth = 16;
    const audioFormat = 1; // 1 = PCM

    // Calculate required values
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const dataSize = buffer.length;

    // Create WAV header
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4); // File size - 8
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(audioFormat, 20); // AudioFormat
    header.writeUInt16LE(channels, 22); // NumChannels
    header.writeUInt32LE(sampleRate, 24); // SampleRate
    header.writeUInt32LE(byteRate, 28); // ByteRate
    header.writeUInt16LE(blockAlign, 32); // BlockAlign
    header.writeUInt16LE(bitDepth, 34); // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40); // Subchunk2Size

    // Combine header and PCM data
    return Buffer.concat([header, buffer]);
  } catch (error) {
    console.error('Error converting to WAV:', error);
    throw new Error('Failed to convert audio to WAV format');
  }
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