import { CoreConnectService } from '@/lib/services/core-connect.service';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';

export type ReportInput = { organizationId: string; fromDate: string; toDate: string; platform?: string; accountId?: string; timezone?: string };
const day = 86_400_000;
const metrics = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views', 'engagementRate'];
function invalid(message: string): never { throw new ZernioApiException({ status: 400, error: message }); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ZernioApiException({ status: 502, error: 'Reporting data is unavailable from the provider.' });
  return value as Record<string, unknown>;
}
export function reportWindow(input: ReportInput, maximum = 365) {
  for (const date of [input.fromDate, input.toDate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) invalid('Choose valid start and end dates.');
  }
  const days = (Date.parse(input.toDate) - Date.parse(input.fromDate)) / day + 1;
  if (days < 1 || days > maximum) invalid(`Choose a period between 1 and ${maximum} days.`);
  const timezone = input.timezone || 'UTC';
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { invalid('Choose a valid timezone.'); }
  return { fromDate: input.fromDate, toDate: input.toDate, timezone, days,
    previousFromDate: new Date(Date.parse(input.fromDate) - days * day).toISOString().slice(0, 10),
    previousToDate: new Date(Date.parse(input.fromDate) - day).toISOString().slice(0, 10) };
}
export function numericFields(value: unknown, keys: string[]) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(keys.map(key => [key, typeof source[key] === 'number' && Number.isFinite(source[key]) ? source[key] : null])) as Record<string, number | null>;
}
async function profile(input: ReportInput) {
  await assertSubServiceAllowed(input.organizationId, 'analytics');
  if (!zernioClient.isConfigured()) throw new ZernioApiException({ status: 503, error: 'Reporting is unavailable until the provider is configured.' });
  const id = await CoreConnectService.ensureTenantProfile(input.organizationId);
  if (input.accountId) {
    const [account] = await requireTenantAccounts(input.organizationId, [input.accountId]);
    if (!['facebook', 'instagram', 'whatsapp'].includes(account.platform) || (input.platform && input.platform !== account.platform)) invalid('The account and channel filters do not match.');
  }
  return id;
}
export class ReportsService {
  static async social(input: ReportInput) {
    const window = reportWindow(input, 366);
    const platform = input.platform && input.platform !== 'all' ? input.platform : 'facebook';
    if (!['facebook', 'instagram'].includes(platform)) invalid('Social reports currently support Facebook and Instagram.');
    if (input.accountId) invalid('Social summaries support a channel filter. Individual account filtering is available in message reports.');
    const profileId = await profile(input);
    const { data } = await zernioClient.request({ path: '/analytics/dashboard', query: {
      profileId, platform, fromDate: window.fromDate, toDate: window.toDate, compare: 'previous_period', topPosts: 10, recentPosts: 10,
    } });
    const raw = record(data);
    if (raw.error || raw.success === false || !raw.totals || !Array.isArray(raw.daily)) record(null);
    const observed = typeof raw.dataAsOf === 'string' && Number.isFinite(Date.parse(raw.dataAsOf)) ? raw.dataAsOf : null;
    const totals = numericFields(observed ? raw.totals : null, metrics);
    const previousTotals = numericFields(observed ? raw.previousTotals : null, metrics);
    const followers = numericFields(observed ? raw.followers : null, ['current', 'gained']);
    const daily = observed ? (raw.daily as unknown[]).map(item => {
      const row = record(item); return { date: typeof row.date === 'string' ? row.date : null, ...numericFields(row, ['impressions', 'reach', 'engagement', 'views', 'followersGained']) };
    }) : [];
    return { source: 'zernio', profileId, platform, dateRange: window, aggregationTimezone: 'provider-defined',
      totals, previousTotals, followers, daily, dataAsOf: observed, fetchedAt: new Date().toISOString(),
      unavailable: !observed,
      topPosts: observed && Array.isArray(raw.topPosts) ? raw.topPosts.map(item => {
        const row = record(item);
        return { postId: typeof row.postId === 'string' ? row.postId : null,
          platform: typeof row.platform === 'string' ? row.platform : null,
          publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : null,
          metrics: numericFields(row.metrics, metrics) };
      }) : null,
      stale: observed ? Date.now() - Date.parse(observed) > day : false,
      note: 'Dates follow the provider reporting calendar. Timezone controls displayed timestamps; daily buckets are not rebucketed.' };
  }

  static async messaging(input: ReportInput) {
    const window = reportWindow(input);
    if (input.platform && !['facebook', 'instagram', 'whatsapp'].includes(input.platform)) invalid('Choose Facebook, Instagram or WhatsApp.');
    const profileId = await profile(input);
    // A single selected channel avoids silently including other connected platforms.
    const platform = input.platform || 'whatsapp';
    const query = { profileId, platform, accountId: input.accountId, fromDate: window.fromDate, toDate: window.toDate };
    const results = await Promise.allSettled([
      zernioClient.request({ path: '/analytics/inbox/volume', query }),
      zernioClient.request({ path: '/analytics/inbox/response-time', query }),
      zernioClient.request({ path: '/analytics/inbox/volume', query: { ...query, fromDate: window.previousFromDate, toDate: window.previousToDate } }),
    ]);
    const get = (index: number) => {
      const result = results[index];
      if (result.status !== 'fulfilled') return null;
      const raw = result.value.data;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.success === false || raw.error || !raw.summary) return null;
      return raw;
    };
    const volume = get(0), response = get(1), previous = get(2);
    const keys = ['received', 'sent', 'read', 'failed', 'uniqueConversations'];
    return { source: 'zernio', platform, accountId: input.accountId || null, dateRange: window,
      summary: numericFields(volume?.summary, keys), previousSummary: numericFields(previous?.summary, keys),
      responseTime: numericFields(response?.summary, ['sampleSize', 'medianSeconds', 'p90Seconds', 'meanSeconds']),
      daily: Array.isArray(volume?.timeseries) ? volume.timeseries.map(item => { const row = record(item); return { date: typeof row.date === 'string' ? row.date : null, ...numericFields(row, ['sent', 'received', 'read', 'failed']) }; }) : [],
      unavailable: !volume, responseTimeUnavailable: !response, previousUnavailable: !previous,
      fetchedAt: new Date().toISOString(), dataAsOf: null, aggregationTimezone: 'provider-defined',
      note: 'The provider does not report a source sync timestamp here. Response-time samples include only messages that received a reply.' };
  }
}

export function reportCsv(rows: unknown[][]): string {
  return '\ufeff' + rows.map(row => row.map(value => {
    let text = value == null ? 'Unavailable' : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
