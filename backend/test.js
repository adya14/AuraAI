const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// PlayHT Configuration
const PLAYHT_USER_ID = process.env.PLAYHT_USER_ID;
const PLAYHT_API_KEY = process.env.PLAYHT_API_KEY;
// Indian accent voices (choose one)
const INDIAN_VOICES = {
  FEMALE: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
  MALE: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/male-cs/manifest.json'
};
const SELECTED_VOICE = INDIAN_VOICES.FEMALE; // Change to MALE if preferred

// Predefined text to convert to speech
const TEST_TEXT = "Namaste! My name is Priya. I'll be your interviewer today. " + 
                  "Tell me about your experience with JavaScript and Node.js. " +
                  "What challenges have you faced while working with asynchronous programming?";

/**
 * Converts text to speech using PlayHT API and saves as MP3
 * @param {string} text - Text to convert to speech
 * @param {string} voice - PlayHT voice ID
 * @returns {Promise<string>} Path to the generated audio file
 */
async function textToSpeech(text, voice = SELECTED_VOICE) {
  try {
    const outputPath = path.join(__dirname, 'output.mp3');
    
    console.log('Converting text to speech with Indian accent...');
    
    // Step 1: Request audio conversion
    const convertResponse = await axios.post(
      'https://play.ht/api/v1/convert',
      {
        content: [text],
        voice: voice,
        globalSpeed: '100%',
        outputFormat: 'mp3',
      },
      {
        headers: {
          'Authorization': `Bearer ${PLAYHT_API_KEY}`,
          'X-User-ID': PLAYHT_USER_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    const transcriptionId = convertResponse.data.transcriptionId;
    console.log('Conversion started. Transcription ID:', transcriptionId);

    // Step 2: Poll for completion
    let audioUrl;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(
        `https://play.ht/api/v1/articleStatus?transcriptionId=${transcriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${PLAYHT_API_KEY}`,
            'X-User-ID': PLAYHT_USER_ID,
          },
        }
      );

      if (statusResponse.data.converted) {
        audioUrl = statusResponse.data.audioUrl;
        break;
      }
      console.log(`Waiting for conversion... (attempt ${i + 1})`);
    }

    if (!audioUrl) {
      throw new Error('Audio conversion timeout');
    }

    // Step 3: Download the audio file
    console.log('Downloading audio file...');
    const audioResponse = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream',
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      audioResponse.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Audio file saved to:', outputPath);
    return outputPath;

  } catch (error) {
    console.error('Error in textToSpeech:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function testIndianAccentTTS() {
  try {
    console.log('Starting Indian accent text-to-speech test...');
    console.log('Text to convert:', TEST_TEXT);
    
    const audioFile = await textToSpeech(TEST_TEXT);
    
    console.log('\nTest completed successfully!');
    console.log('You can now play:', audioFile);
    console.log('On most systems, you can play it with:');
    console.log(`- Mac: afplay ${audioFile}`);
    console.log(`- Linux: mpg123 ${audioFile}`);
    console.log(`- Windows: start ${audioFile}`);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testIndianAccentTTS();