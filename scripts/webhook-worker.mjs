// Durable jobs live in PostgreSQL; this process only wakes the authenticated worker.
const endpoint = process.env.WEBHOOK_DRAIN_URL || 'http://127.0.0.1:3008/api/internal/webhooks/drain';
const campaignEndpoint = new URL('/api/internal/campaigns/drain', endpoint).toString();
const billingEndpoint = new URL('/api/internal/billing/drain', endpoint).toString();
const secret = process.env.WEBHOOK_DRAIN_SECRET?.trim();
if (!secret || secret.length < 32) throw new Error('Configure WEBHOOK_DRAIN_SECRET with at least 32 characters.');
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
do {
  for (const target of [endpoint, campaignEndpoint, billingEndpoint]) {
  try {
    const response = await fetch(target, { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55_000) });
    if (!response.ok) throw new Error(`${target === endpoint ? 'Webhook' : target === campaignEndpoint ? 'Campaign' : 'Billing'} worker returned HTTP ${response.status}`);
    const result = await response.json();
    if (target === endpoint && (result.delivered || result.failed)) console.log(`Webhook deliveries: ${Number(result.delivered) || 0} delivered, ${Number(result.failed) || 0} queued for retry.`);
    if (result.submitted || result.stopped) console.log(`Campaigns: ${Number(result.submitted) || 0} submitted, ${Number(result.stopped) || 0} stopped for review.`);
    if (target === billingEndpoint && result.processed) console.log(`Billing: ${Number(result.processed)} renewals charged from prepaid funds.`);
    if (target === billingEndpoint && result.failed) console.error(`Billing: ${Number(result.failed)} workspaces require renewal review.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Webhook worker unavailable');
    if (process.argv.includes('--once')) process.exitCode = 1;
  }
  }
  if (process.argv.includes('--once') || stopping) break;
  await new Promise(resolve => setTimeout(resolve, 30_000));
} while (!stopping);
