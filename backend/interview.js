const { getInterviewPrompt } = require('./prompt');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fs = require('fs');
const path = require('path');

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

    // Add logging for the transcription
    console.log(response);

    return response;
  } catch (error) {
    console.error('Transcription failed:', error.message);
    throw new Error('Could not transcribe audio');
  }
}

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