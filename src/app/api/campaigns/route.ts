import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { CampaignService } from '@/lib/campaigns/service';
import { CampaignStore } from '@/lib/campaigns/store';
import { ZernioApiException } from '@/lib/zernio/client';
import { reportCsv } from '@/lib/reports/service';

const headers = { 'Cache-Control': 'no-store' };
const campaignId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function failure(error: unknown) {
  const status = error instanceof TenantAccessError ? error.status : error instanceof ZernioApiException ? error.envelope.status : 503;
  return NextResponse.json({ success: false, error: error instanceof TenantAccessError || error instanceof ZernioApiException ? error.message : 'Campaigns are unavailable. Refresh before retrying.' }, { status, headers });
}
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams, { session, role } = await requireTenantAccess(request, q.get('organizationId'));
    const org = session.tenant.organizationId, id = q.get('id'), skip = Number(q.get('skip') || 0);
    if (!Number.isInteger(skip) || skip < 0 || skip > 100000) throw new TenantAccessError(400, 'Invalid page offset.');
    if (!id) return NextResponse.json({ success: true, role, campaigns: await CampaignStore.list(org, skip) }, { headers });
    if (!campaignId.test(id)) throw new TenantAccessError(400, 'Select a valid campaign.');
    const result = await CampaignService.results(org, id, skip, q.get('status') || undefined);
    if (q.get('format') === 'csv') {
      requireWorkspaceRole(role, true);
      const rows = (result.recipients || []) as Record<string, unknown>[];
      return new Response(reportCsv([['campaign', result.campaign.name], ['observedAt', result.observedAt], ['scope', 'Current filtered recipient page'], ['provider cost', null], ['recipient', 'status', 'sentAt', 'deliveredAt', 'readAt', 'error'], ...rows.map(row => [row.platformIdentifier, row.status, row.sentAt, row.deliveredAt, row.readAt, row.errorExplanation || row.error])]), {
        headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="asra3-campaign-results.csv"' },
      });
    }
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const { session, role } = await requireTenantAccess(request); requireWorkspaceRole(role, true);
    const text = await request.text(); if (text.length > 300000) throw new TenantAccessError(413, 'Campaign request is too large.');
    let body: Record<string, unknown>; try { body = JSON.parse(text); } catch { throw new TenantAccessError(400, 'Expected a JSON object.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TenantAccessError(400, 'Expected a JSON object.');
    if (body.organizationId && body.organizationId !== session.tenant.organizationId) throw new TenantAccessError(403, 'This workspace is not accessible.');
    const org = session.tenant.organizationId, id = String(body.id || ''); let result: unknown;
    if (!['preview', 'save'].includes(String(body.action)) && !campaignId.test(id)) throw new TenantAccessError(400, 'Select a valid campaign.');
    switch (body.action) {
      case 'preview': result = await CampaignService.preview(org, body.contactIds); break;
      case 'save': result = { campaign: await CampaignService.save(org, session.user.id, body) }; break;
      case 'schedule': result = { campaign: await CampaignService.schedule(org, id, body.revision, body.scheduledAt) }; break;
      case 'send':
        if (!Number.isInteger(body.revision) || body.confirmSend !== true) throw new TenantAccessError(400, 'Review and confirm this campaign before sending.');
        result = { campaign: await CampaignService.dispatch(org, id, body.revision as number) }; break;
      case 'cancel': result = { campaign: await CampaignService.cancel(org, id, body.revision) }; break;
      case 'reconcile': result = { campaign: await CampaignService.reconcile(org, id, body.revision) }; break;
      case 'delete': {
        requireWorkspaceRole(role);
        const campaign = await CampaignStore.get(org, id);
        if (body.revision !== campaign.revision) throw new TenantAccessError(409, 'The campaign changed. Refresh first.');
        await CampaignStore.delete(campaign); result = { deleted: true }; break;
      }
      default: throw new TenantAccessError(400, 'Unsupported campaign action.');
    }
    return NextResponse.json({ success: true, ...result as Record<string, unknown> }, { headers });
  } catch (error) { return failure(error); }
}
