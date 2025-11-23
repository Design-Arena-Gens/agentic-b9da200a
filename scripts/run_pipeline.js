'use strict';
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { ensureDir, writeText, writeJSON, todayStr } = require('./lib/util');
const { generateScript } = require('./generate_script');
const { ttsToFile } = require('./tts');
const { fetchVerticalClips } = require('./footage');
const { compose } = require('./compose');
const { generateMetadata } = require('./metadata');
const { uploadShort } = require('./upload_youtube');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { date: todayStr(), noUpload: false, topic: '' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--date=')) out.date = a.split('=')[1];
    else if (a === '--no-upload') out.noUpload = true;
    else if (a.startsWith('--topic=')) out.topic = a.split('=')[1];
  }
  return out;
}

async function main() {
  const { date, noUpload, topic } = parseArgs();
  const outDir = path.join('output', date);
  ensureDir(outDir);
  ensureDir(path.join(outDir, 'clips'));

  console.log('1) Generating script...');
  const scriptText = await generateScript(topic);
  writeText(path.join(outDir, 'script.txt'), scriptText);

  console.log('2) TTS synthesis...');
  const audioPath = path.join(outDir, 'voice.mp3');
  await ttsToFile(scriptText, audioPath);

  console.log('3) Fetching stock footage...');
  const clips = await fetchVerticalClips('artificial intelligence, technology, typing computer', 5, path.join(outDir, 'clips'));
  if (clips.length === 0) throw new Error('No clips downloaded');

  console.log('4) Composing final video...');
  const finalPath = path.join(outDir, 'final.mp4');
  await compose(clips, audioPath, finalPath);

  console.log('5) Generating metadata...');
  const meta = await generateMetadata(scriptText, process.env.AFFILIATE_LINKS || '');
  writeJSON(path.join(outDir, 'metadata.json'), meta);

  if (!noUpload) {
    console.log('6) Uploading to YouTube...');
    const video = await uploadShort(finalPath, meta.title, meta.description, meta.tags);
    writeJSON(path.join(outDir, 'upload_result.json'), video);
    console.log('Uploaded video id:', video.id);
  } else {
    console.log('Upload skipped (no-upload flag).');
  }

  console.log('Done. Output directory:', outDir);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
