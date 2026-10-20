import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { runMetaCommentsAction } from '@/lib/meta-comments/actions';
import { inboxError } from '@/lib/inbox/actions';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    const { session } = await requireTenantAccess(request, input.organizationId);
    if (!['accounts', 'posts', 'comments'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported comment read action.');
    const result = await runMetaCommentsAction(session.tenant.organizationId, input.action, input);
    return Response.json(result, { status: result.httpStatus, headers });
  } catch (error) { const failure = inboxError(error); return Response.json(failure.payload, { status: failure.status, headers }); }
}

export async function POST(request: Request) {
  try {
    let input: Record<string, any>;
    try { input = await request.json(); } catch { throw new TenantAccessError(400, 'Expected a JSON object.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const { session, role } = await requireTenantAccess(request, input.organizationId);
    requireWorkspaceRole(role, true);
    if (!['reply', 'private_reply', 'hide', 'delete'].includes(input.action)) throw new TenantAccessError(400, 'Unsupported comment action.');
    const result = await runMetaCommentsAction(session.tenant.organizationId, input.action,
      { ...input, idempotencyKey: request.headers.get('idempotency-key') || input.idempotencyKey });
    return Response.json(result, { status: result.httpStatus, headers });
  } catch (error) { const failure = inboxError(error); return Response.json(failure.payload, { status: failure.status, headers }); }
}
