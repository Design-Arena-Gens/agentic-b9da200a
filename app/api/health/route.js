import { NextResponse } from 'next/server';

export async function GET() {
  const envs = ['OPENAI_API_KEY','PEXELS_API_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN'];
  const present = envs.filter((k) => !!process.env[k]);
  return NextResponse.json({ ok: true, env_present: present });
}
