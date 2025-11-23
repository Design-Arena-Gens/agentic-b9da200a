'use strict';
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

async function ttsToFile(text, outPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const body = {
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
    input: text
  };
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`TTS error: ${res.status} ${await res.text()}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.outputFileSync(outPath, buffer);
  return outPath;
}

if (require.main === module) {
  const text = process.argv.slice(2).join(' ');
  if (!text) {
    console.error('Provide text');
    process.exit(1);
  }
  const out = path.join('output', 'latest', 'voice.mp3');
  ttsToFile(text, out).then(() => console.log('Saved', out)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { ttsToFile };
