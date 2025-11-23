'use strict';
require('dotenv').config();
const { writeJSON } = require('./lib/util');

async function generateMetadata(scriptText, affiliateLinksCsv) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const affiliateLinks = (affiliateLinksCsv || '').split(',').map(s => s.trim()).filter(Boolean);
  const sys = 'You craft SEO-optimized YouTube Shorts metadata that boosts CTR and CPM.';
  const user = `Script:\n\n${scriptText}\n\nGenerate:\n- A title (max 60 chars)\n- A description (2-3 lines) including these affiliate links if relevant: ${affiliateLinks.join(' ')}. Add a clear CTA.\n- 12 tags (comma-separated) focused on AI and money-making.`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ],
      temperature: 0.8,
      max_tokens: 300
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  // simple parsing
  const titleMatch = text.match(/title\s*[:\-]?\s*(.*)/i);
  const tagsMatch = text.match(/tags?\s*[:\-]?\s*(.*)/i);
  const title = titleMatch ? titleMatch[1].trim() : text.split('\n')[0].trim();
  const tagsCsv = tagsMatch ? tagsMatch[1].trim() : '';
  const description = text
    .replace(/title\s*[:\-]?.*/i, '')
    .replace(/tags?\s*[:\-]?.*/i, '')
    .trim();
  return { title, description, tags: tagsCsv.split(',').map(t=>t.trim()).filter(Boolean) };
}

if (require.main === module) {
  (async () => {
    const meta = await generateMetadata('AI side hustle ideas...', process.env.AFFILIATE_LINKS || '');
    writeJSON('output/latest/metadata.json', meta);
    console.log('metadata saved');
  })().catch((e)=>{ console.error(e); process.exit(1); });
}

module.exports = { generateMetadata };
