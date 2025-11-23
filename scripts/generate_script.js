'use strict';
require('dotenv').config();
const { writeText } = require('./lib/util');

async function generateScript(topicHint) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const prompt = `You are a YouTube Shorts scriptwriter.
Write a punchy 30?60 second script (90-130 words) for a vertical video in the AI & making-money-with-AI niche.
Goal: maximize retention and CPM. Include hook, 2-3 value points, and a CTA to check links.
Style: global audience, simple language, hype but credible. No hashtags. No emojis.
Topic hint: ${topicHint || 'AI side hustles using ChatGPT and automation'}
Output ONLY the script lines.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write short, high-retention scripts.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 220
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const script = data.choices?.[0]?.message?.content?.trim();
  if (!script) throw new Error('No script content');
  return script;
}

async function main() {
  const topic = process.argv.slice(2).join(' ');
  const script = await generateScript(topic);
  const out = 'output/latest/script.txt';
  writeText(out, script);
  console.log('Script saved to', out);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { generateScript };
