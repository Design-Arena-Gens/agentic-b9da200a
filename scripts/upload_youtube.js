'use strict';
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

async function getAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth env vars');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function createResumableSession(accessToken, snippet, status) {
  const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/*'
    },
    body: JSON.stringify({ snippet, status })
  });
  if (!res.ok) throw new Error(`Create session error: ${res.status} ${await res.text()}`);
  const location = res.headers.get('location');
  if (!location) throw new Error('No upload location header');
  return location;
}

async function uploadVideo(location, filePath) {
  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const res = await fetch(location, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/*',
      'Content-Length': String(stat.size)
    },
    body: stream
  });
  if (!res.ok) throw new Error(`Upload error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data;
}

async function uploadShort(videoPath, title, description, tags) {
  const accessToken = await getAccessToken();
  const snippet = {
    title,
    description,
    tags,
    categoryId: '28' // Science & Technology
  };
  const status = {
    privacyStatus: process.env.YT_PRIVACY || 'public',
    selfDeclaredMadeForKids: false
  };
  const location = await createResumableSession(accessToken, snippet, status);
  const video = await uploadVideo(location, videoPath);
  return video;
}

if (require.main === module) {
  (async () => {
    const out = await uploadShort('output/latest/final.mp4', 'Test Title', 'Test desc', ['ai']);
    console.log('Uploaded video id:', out.id);
  })().catch((e)=>{ console.error(e); process.exit(1); });
}

module.exports = { uploadShort };
