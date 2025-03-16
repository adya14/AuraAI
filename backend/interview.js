const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Constants for role and job description
// const ROLE = "SDE"; 
// const JOB_DESCRIPTION = "Python, ML, Cloud"; 

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

    // Add the full conversation history
    if (conversationHistory) {
      messages.push(...conversationHistory);
    }

    // Add the user's input
    messages.push({ role: "user", content: text });

    // If requesting a rating, add the rating prompt
    if (requestRating) {
      messages.push({
        role: "user",
        content: "Now that the interview is complete, rate the candidate out of 10 based on their performance.",
      });
    }

    // Call OpenAI's API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}

// Export the functions
module.exports = {
  transcribeAudio,
  getAiResponse,
};