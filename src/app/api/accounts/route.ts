import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { disconnectAccount } from '@/lib/accounts/lifecycle';
import { publishingError } from '@/lib/publishing/actions';

const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const input = new URL(request.url).searchParams;
    const { session } = await requireTenantAccess(request, input.get('organizationId'));
    const result = await CoreConnectService.listTenantAccountsWithHealth(session.tenant.organizationId);
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    const { status, payload } = publishingError(error);
    return NextResponse.json(payload, { status, headers });
  }
}
export async function POST(request: Request) {
  try {
    let input: Record<string, any>;
    try { input = await request.json(); } catch { throw new TenantAccessError(400, 'Expected a JSON object.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const { session, role } = await requireTenantAccess(request, input.organizationId);
    requireWorkspaceRole(role);
    if (input.action !== 'disconnect') throw new TenantAccessError(400, 'Unsupported account action.');
    return NextResponse.json(await disconnectAccount(session.tenant.organizationId, input.accountId), { headers });
  } catch (error) {
    const { status, payload } = publishingError(error);
    return NextResponse.json(payload, { status, headers });
  }
}
