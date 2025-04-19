const fs = require('fs');
const sound = require('sound-play');
require('dotenv').config();

(async () => {
  const fetch = (await import('node-fetch')).default;

  // 1. Fetch the list of voices
  const voicesRes = await fetch('https://api.play.ai/api/v1/voices', {
    headers: {
      'Authorization': `Bearer ${process.env.PLAYHT_API_KEY}`,
      'X-USER-ID': process.env.PLAYHT_USER_ID,
      'Content-Type': 'application/json'
    }
  });

  const voices = await voicesRes.json();

  // 2. Pick the first Hindi/Indian voice
  const indianVoice = voices.find(v => v.language?.toLowerCase().includes('hindi') || v.name?.toLowerCase().includes('india'));

  if (!indianVoice) {
    console.error('No Indian/Hindi voice found.');
    return;
  }

  console.log(`Using voice: ${indianVoice.name} (${indianVoice.id})`);

  // 3. Prepare TTS request payload
  const payload = {
    model: 'PlayDialog',
    text: 'Hello, this is a test message using an Indian voice from PlayHT.',
    voice: indianVoice.id,
    outputFormat: 'wav'
  };

  // 4. Stream TTS audio from PlayHT
  const ttsRes = await fetch('https://api.play.ai/api/v1/tts/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PLAYHT_API_KEY}`,
      'X-USER-ID': process.env.PLAYHT_USER_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!ttsRes.ok) {
    console.error(`TTS generation failed: ${ttsRes.status}`);
    const errorText = await ttsRes.text();
    console.error(errorText);
    return;
  }

  // 5. Save audio to file
  const filePath = 'output.wav';
  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    ttsRes.body.pipe(fileStream);
    ttsRes.body.on('end', resolve);
    ttsRes.body.on('error', reject);
  });

  console.log(`Audio saved to ${filePath}`);

  // 6. Play audio
  sound.play(filePath)
    .then(() => console.log('Playback finished.'))
    .catch(err => console.error('Playback error:', err));
})();
