import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { drainZernioWebhookOutbox } from '@/lib/webhooks/outbox';

export const maxDuration = 60;

/** Invoke from the deployment scheduler with a server-only bearer secret. */
export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_DRAIN_SECRET?.trim();
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Webhook worker is not configured.' }, { status: 503 });
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const result = await drainZernioWebhookOutbox(25);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Webhook processing is unavailable. Pending deliveries remain queued.' }, { status: 503 });
  }
}
