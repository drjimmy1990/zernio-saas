import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { runPublishingAction, publishingError } from '@/lib/publishing/actions';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    const { session } = await requireTenantAccess(request, input.organizationId);
    if (!['accounts', 'posts', 'post', 'instagram_limit', 'tiktok_creator_info'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported publishing read action.');
    const result = await runPublishingAction(session.tenant.organizationId, input.action, input);
    return NextResponse.json(result, { status: result.httpStatus || 200, headers });
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
    requireWorkspaceRole(role, true);
    if (!['create', 'update', 'delete', 'retry', 'presign', 'create_queue', 'validate_post', 'validate_media', 'validate_tiktok'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported publishing mutation.');
    const result = await runPublishingAction(session.tenant.organizationId, input.action,
      { ...input, idempotencyKey: request.headers.get('idempotency-key') || input.idempotencyKey });
    return NextResponse.json(result, { status: result.httpStatus || 200, headers });
  } catch (error) {
    const { status, payload } = publishingError(error);
    return NextResponse.json(payload, { status, headers });
  }
}
