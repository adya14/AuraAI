const { getInterviewPrompt } = require('./prompt');

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Convert audio to text using OpenAI's Whisper API.
 * @param {Buffer} audioFile - The audio file to transcribe.
 * @returns {Promise<string>} - The transcribed text.
 */
async function transcribeAudio(audioFile) {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

/**
 * Generate AI interview questions and final rating.
 * @param {string} text - The user's input text.
 * @param {string} role - The role being interviewed for.
 * @param {string} jobDescription - The job description.
 * @param {boolean} requestRating - Whether to request a rating.
 * @param {Array} conversationHistory - The conversation history.
 * @returns {Promise<string>} - The AI-generated response.
 */

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