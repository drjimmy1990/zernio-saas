import crypto from 'crypto';
import { deliverCustomerWebhook } from './delivery';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Run from an authenticated scheduler. Expired leases survive process restarts. */
export async function drainZernioWebhookOutbox(limit = 25) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Webhook service role required');
  const db = createSupabaseAdminClient();
  if (!db) throw new Error('Webhook database unavailable');
  const token = crypto.randomUUID();
  const { data: jobs, error } = await db.rpc('claim_zernio_webhook_outbox', {
    p_token: token, p_limit: Math.min(25, Math.max(1, limit)),
  }).abortSignal(AbortSignal.timeout(4000));
  if (error) throw new Error('Could not claim webhook deliveries');
  let delivered = 0;
  let failed = 0;
  await Promise.all((jobs || []).map(async (job: {
    id: string; url: string; secret: string; payload: Record<string, unknown>;
  }) => {
    const raw = JSON.stringify(job.payload);
    const signature = `sha256=${crypto.createHmac('sha256', job.secret).update(raw).digest('hex')}`;
    let status = 0;
    try {
      status = await deliverCustomerWebhook(job.url, raw, {
        'Content-Type': 'application/json', 'X-Asra3-Event': String(job.payload.event),
        'X-Asra3-Event-Id': String(job.payload.id), 'X-Asra3-Signature': signature,
      });
    } catch { /* Persist retry below, including network timeouts. */ }
    const success = status >= 200 && status < 300;
    const { data, error: ackError } = await db.rpc('finish_zernio_webhook_outbox', {
      p_id: job.id, p_token: token, p_status: status, p_success: success,
    }).abortSignal(AbortSignal.timeout(4000));
    if (ackError || !data) throw new Error('Could not persist webhook delivery result');
    if (success) delivered++; else failed++;
  }));
  return { delivered, failed };
}
