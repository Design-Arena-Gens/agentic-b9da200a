'use strict';
require('dotenv').config();
const { createClient } = require('pexels');
const fs = require('fs-extra');
const path = require('path');

async function fetchVerticalClips(query, count, outDir) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY missing');
  const client = createClient(key);
  const results = await client.videos.search({ query, per_page: 20, orientation: 'portrait' });
  const videos = results.videos || [];
  const selected = [];
  for (const v of videos) {
    const files = v.video_files || [];
    const portrait = files
      .filter(f => f.height >= 1280 && f.width <= f.height)
      .sort((a, b) => (a.height - b.height));
    if (portrait[0]) selected.push(portrait[0]);
    if (selected.length >= count) break;
  }
  fs.ensureDirSync(outDir);
  const paths = [];
  for (let i = 0; i < selected.length; i++) {
    const url = selected[i].link;
    const res = await fetch(url);
    if (!res.ok) continue;
    const dest = path.join(outDir, `clip_${i + 1}.mp4`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    paths.push(dest);
  }
  return paths;
}

if (require.main === module) {
  const q = process.argv.slice(2).join(' ') || 'technology ai';
  fetchVerticalClips(q, 5, path.join('output','latest','clips')).then((paths) => {
    console.log('Downloaded', paths.length, 'clips');
  }).catch((e)=>{ console.error(e); process.exit(1); });
}

module.exports = { fetchVerticalClips };
