import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { runWhatsAppAction, whatsAppError } from '@/lib/whatsapp/actions';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    const { session } = await requireTenantAccess(request, input.organizationId);
    if (!['accounts', 'conversations', 'conversation', 'messages', 'templates', 'broadcasts', 'get_broadcast'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported WhatsApp read action.');
    const result = await runWhatsAppAction(session.tenant.organizationId, input.action, input);
    return NextResponse.json(result, { status: result.httpStatus, headers });
  } catch (error) {
    const { status, payload } = whatsAppError(error);
    return NextResponse.json(payload, { status, headers });
  }
}

export async function POST(request: Request) {
  try {
    let input: Record<string, any>;
    try { input = await request.json(); } catch { throw new TenantAccessError(400, 'Expected a JSON object.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const { session, role } = await requireTenantAccess(request, input.organizationId);
    requireWorkspaceRole(role, true);
    if (!['send', 'create_template', 'mark_read', 'create_broadcast', 'add_broadcast_recipients', 'send_broadcast'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported WhatsApp mutation.');
    const result = await runWhatsAppAction(session.tenant.organizationId, input.action,
      { ...input, idempotencyKey: request.headers.get('idempotency-key') || input.idempotencyKey });
    return NextResponse.json(result, { status: result.httpStatus, headers });
  } catch (error) {
    const { status, payload } = whatsAppError(error);
    return NextResponse.json(payload, { status, headers });
  }
}
