'use strict';
require('dotenv').config();
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const dur = data.format?.duration || 0;
      resolve(Number(dur));
    });
  });
}

async function preprocessToVertical(inputPath, outPath) {
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .videoFilters([
        // Scale to fill height, then crop/pad to 1080x1920
        {
          filter: 'scale',
          options: { w: 1080, h: -1, flags: 'lanczos', force_original_aspect_ratio: 'decrease' }
        },
        {
          filter: 'pad',
          options: { w: 1080, h: 1920, x: '(ow-iw)/2', y: '(oh-ih)/2', color: 'black' }
        },
        { filter: 'setsar', options: 1 }
      ])
      .outputOptions([
        '-r 30',
        '-pix_fmt yuv420p',
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23'
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outPath);
  });
  return outPath;
}

async function concatWithAudio(preprocessedPaths, audioPath, outPath) {
  // Ensure total video >= audio duration; duplicate list if needed
  const audioDur = await ffprobeDuration(audioPath);
  const clipDurs = await Promise.all(preprocessedPaths.map(ffprobeDuration));
  let total = clipDurs.reduce((a,b)=>a+b,0);
  let list = [...preprocessedPaths];
  while (total < audioDur + 1 && list.length < 50) { // safety cap
    list = list.concat(preprocessedPaths);
    total += clipDurs.reduce((a,b)=>a+b,0);
  }
  const workDir = path.dirname(outPath);
  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, list.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .input(audioPath)
      .outputOptions([
        '-map 0:v:0',
        '-map 1:a:0',
        '-shortest',
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p'
      ])
      .complexFilter([
        // Simple overlay text cues
        "drawtext=text='AI Money Hacks':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=80:enable='lt(t,3)',",
        "drawtext=text='Links in description':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h-th-100:enable='between(t,6,10)'"
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outPath);
  });
  return outPath;
}

async function compose(clips, audioPath, outPath) {
  const workDir = path.join(path.dirname(outPath), 'work');
  fs.ensureDirSync(workDir);
  const preprocessed = [];
  for (let i = 0; i < clips.length; i++) {
    const inPath = clips[i];
    const out = path.join(workDir, `v_${i + 1}.mp4`);
    await preprocessToVertical(inPath, out);
    preprocessed.push(out);
  }
  await concatWithAudio(preprocessed, audioPath, outPath);
  return outPath;
}

if (require.main === module) {
  (async () => {
    const out = path.join('output','latest','final.mp4');
    await compose([path.join('output','latest','clips','clip_1.mp4')], path.join('output','latest','voice.mp3'), out);
    console.log('Saved', out);
  })().catch((e)=>{ console.error(e); process.exit(1); });
}

module.exports = { compose };
