import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { runMetaInboxAction, inboxError } from '@/lib/inbox/actions';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    const { session } = await requireTenantAccess(request, input.organizationId);
    if (!['accounts', 'conversations', 'conversation', 'messages'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported inbox read action.');
    const result = await runMetaInboxAction(session.tenant.organizationId, input.action, input);
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
    requireWorkspaceRole(role, true);
    if (!['send', 'mark_read', 'accept'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported inbox mutation.');
    const result = await runMetaInboxAction(session.tenant.organizationId, input.action,
      { ...input, idempotencyKey: request.headers.get('idempotency-key') || input.idempotencyKey });
    return NextResponse.json(result, { status: result.httpStatus, headers });
  } catch (error) {
    const failure = inboxError(error);
    return NextResponse.json(failure.payload, { status: failure.status, headers });
  }
}
