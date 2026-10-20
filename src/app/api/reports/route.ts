import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { ReportsService, reportCsv } from '@/lib/reports/service';
import { ZernioApiException } from '@/lib/zernio/client';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const q = new URL(request.url).searchParams;
    const { session, role } = await requireTenantAccess(request, q.get('organizationId'));
    const kind = q.get('kind') || 'social';
    if (!['social', 'messaging'].includes(kind)) throw new TenantAccessError(400, 'Choose a report type.');
    if (q.get('format') === 'csv') requireWorkspaceRole(role, true);
    const input = { organizationId: session.tenant.organizationId, fromDate: q.get('fromDate') || '', toDate: q.get('toDate') || '', platform: q.get('platform') || undefined, accountId: q.get('accountId') || undefined, timezone: q.get('timezone') || undefined };
    const report = kind === 'social' ? await ReportsService.social(input) : await ReportsService.messaging(input);
    if (q.get('format') === 'csv') {
      const totals = 'totals' in report ? report.totals : report.summary;
      const previous = 'previousTotals' in report ? report.previousTotals : report.previousSummary;
      const dailyKeys = [...new Set(report.daily.flatMap(row => Object.keys(row)))];
      const details: unknown[][] = [];
      if ('responseTime' in report) details.push([], ['response-time metric', 'value'], ...Object.entries(report.responseTime).map(([key, value]) => [key, value]));
      if ('followers' in report) details.push([], ['followers metric', 'value'], ...Object.entries(report.followers).map(([key, value]) => [key, value]));
      details.push([], ['daily data', report.daily.length ? 'Provider rows' : 'No daily rows provided'], dailyKeys, ...report.daily.map(row => dailyKeys.map(key => (row as Record<string, unknown>)[key])));
      return new Response(reportCsv([
        ['report', kind], ['channel', report.platform], ['from', input.fromDate], ['to', input.toDate],
        ['source', report.source], ['dataAsOf', report.dataAsOf], ['fetchedAt', report.fetchedAt], ['note', report.note],
        ['previousFrom', report.dateRange.previousFromDate], ['previousTo', report.dateRange.previousToDate], ['displayTimezone', report.dateRange.timezone],
        ['metric', 'current', 'previous'], ...Object.entries(totals).map(([key, value]) => [key, value, previous[key]]),
        ...details,
      ]), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="asra3-${kind}-${input.fromDate}-${input.toDate}.csv"` } });
    }
    return NextResponse.json({ success: true, role, report }, { headers });
  } catch (error) {
    const status = error instanceof TenantAccessError ? error.status : error instanceof ZernioApiException ? error.envelope.status : 503;
    return NextResponse.json({ success: false, error: error instanceof TenantAccessError || error instanceof ZernioApiException ? error.message : 'Reporting is unavailable. Try again.' }, { status, headers });
  }
}
