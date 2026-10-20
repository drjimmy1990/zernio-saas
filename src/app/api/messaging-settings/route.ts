import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { inboxError } from '@/lib/inbox/actions';
import { runMetaSettingsAction } from '@/lib/meta-settings/actions';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    const { session } = await requireTenantAccess(request, input.organizationId);
    if (!['accounts', 'settings'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported settings read action.');
    const result = await runMetaSettingsAction(session.tenant.organizationId, input.action, input);
    return NextResponse.json(result, { status: result.httpStatus, headers });
  } catch (error) {
    const failure = inboxError(error);
    return NextResponse.json(failure.payload, { status: failure.status, headers });
  }
}

export async function POST(request: Request) {
  try {
    let input: Record<string, any>;
    try { input = await request.json(); } catch { throw new TenantAccessError(400, 'Expected a JSON object.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const { session, role } = await requireTenantAccess(request, input.organizationId);
    if (!['save', 'reset', 'thread_control'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported settings mutation.');
    requireWorkspaceRole(role, input.action === 'thread_control');
    const result = await runMetaSettingsAction(session.tenant.organizationId, input.action, input);
    return NextResponse.json(result, { status: result.httpStatus, headers });
  } catch (error) {
    const failure = inboxError(error);
    return NextResponse.json(failure.payload, { status: failure.status, headers });
  }
}
