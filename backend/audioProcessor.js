const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

module.exports = {
  convertAudio: async function(buffer) {
    const tempDir = fs.mkdtempSync(path.join(tmpdir(), 'twilio_'));
    const inputPath = path.join(tempDir, 'input.ulaw');
    const outputPath = path.join(tempDir, 'output.wav');
    
    try {
      fs.writeFileSync(inputPath, buffer);
      execSync(
        `sox -t raw -r 8000 -e mu-law -c 1 "${inputPath}" -t wav "${outputPath}"`,
        { timeout: 5000 }
      );
      return fs.readFileSync(outputPath);
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Temp cleanup error:', e.message);
      }
    }
  }
};