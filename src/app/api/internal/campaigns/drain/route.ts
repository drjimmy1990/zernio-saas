import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { CampaignService } from '@/lib/campaigns/service';

export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_DRAIN_SECRET?.trim();
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Campaign worker is not configured.' }, { status: 503 });
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const expected = Buffer.from(secret), actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try { return NextResponse.json(await CampaignService.drain(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Campaign scheduling is unavailable. No success is assumed.' }, { status: 503 }); }
}
