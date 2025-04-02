const fs = require('fs');
const path = require('path');

const RECORDINGS_DIR = './call_recordings';
const CALL_SID = 'CA8262db7d171aafc399e898ad97dfcbff';

// 1. Combine files while maintaining μ-law encoding
const ulawFiles = fs.readdirSync(path.join(RECORDINGS_DIR, CALL_SID))
  .filter(f => f.endsWith('.ulaw'))
  .sort();

const combined = Buffer.concat(
  ulawFiles.map(file => 
    fs.readFileSync(path.join(RECORDINGS_DIR, CALL_SID, file))
));

fs.writeFileSync('combined.ulaw', combined);