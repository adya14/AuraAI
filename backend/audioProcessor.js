const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

module.exports = {
  convertAudio: (buffer, sampleRate = 16000) => {
    const tempDir = path.join(tmpdir(), 'twilio_audio');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const inputPath = path.join(tempDir, `input_${Date.now()}.ulaw`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);
    
    try {
      // Save input file
      fs.writeFileSync(inputPath, buffer);
      
      // Convert using SoX
      execSync(
        `"${process.env.SOX_PATH || 'sox'}" -t raw -r 8000 -e mu-law -c 1 "${inputPath}" -t wav "${outputPath}" rate -v ${sampleRate}`,
        { stdio: 'ignore' }
      );
      
      // Read converted file
      const result = fs.readFileSync(outputPath);
      return result;
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    } finally {
      // Cleanup
      [inputPath, outputPath].forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  }
};