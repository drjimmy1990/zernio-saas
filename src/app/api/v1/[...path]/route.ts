import type { ApiKeyScope } from '@/lib/storage/workspace-store';
import { SaasApiKeyService } from '@/lib/saas/api-keys';
import { runLaunchPublicApi } from '@/lib/launch/public-actions';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, canManageWorkspace, TenantAccessError, type TenantRole } from '@/lib/auth/tenant-access';
import { resolveEffectiveTenantPolicy } from '@/lib/zernio/policy-engine';
import { isWhatsAppLifecyclePath } from '@/lib/whatsapp/actions';
import { runInboxPublicApi, inboxError } from '@/lib/inbox/actions';
import { runMetaCommentsPublicApi } from '@/lib/meta-comments/actions';
import { isMetaSettingsPath, isMetaThreadControlPath, runMetaSettingsPublicApi } from '@/lib/meta-settings/actions';
import { isPublishingPath, runPublishingPublicApi, publishingError } from '@/lib/publishing/actions';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { disconnectAccount } from '@/lib/accounts/lifecycle';
import { unavailablePublicFeature } from '@/lib/launch/availability';
import { getOpenApiV1Spec, getPostmanV1Collection } from '@/lib/zernio/openapi-spec';

function getRateLimitHeaders(_tenantId: string, _limit = 120): Record<string,string> {
  return { 'Cache-Control':'no-store', 'X-Asra3-Api-Version':'2026-10-20',
    'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, Idempotency-Key, X-Idempotency-Key' };
}

function hasScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (!scopes || scopes.length === 0) return false;
  if (scopes.includes('full_access')) return true;
  if (scopes.includes(required)) return true;
  if (required === 'accounts:read' && scopes.includes('accounts:write')) return true;
  if (required === 'telephony:read' && scopes.includes('telephony:write')) return true;
  return false;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Idempotency-Key, X-Asra3-Signature',
    },
  });
}

async function handleApiV1(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
  const startMs = Date.now();
  const { path = [] } = await context.params;
  const routeKey = '/' + path.join('/');
  const method = req.method.toUpperCase();
  const baseUrl = req.nextUrl.origin || 'https://asra3.com';

  // Public spec endpoints (do not require auth so developers can download specs easily)
  if (method === 'GET' && routeKey === '/openapi.json') {
    return NextResponse.json(getOpenApiV1Spec(baseUrl), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'inline; filename="asra3-openapi-v1.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (method === 'GET' && routeKey === '/postman.json') {
    return NextResponse.json(getPostmanV1Collection(baseUrl, 'YOUR_API_KEY'), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'inline; filename="asra3-postman-collection-v1.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Authenticate via Authorization: Bearer asra3_... OR fallback to active session cookie for interactive Docs/Dashboard
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : req.nextUrl.searchParams.get('api_key') || '';

  let tenantId = '';
  let scopes: ApiKeyScope[] = [];
  let keyPrefix = 'session_auth';
  let keyName = 'Interactive Session';
  let actorId = '';
  let sessionRole: TenantRole | null = null;

  if (bearerToken) {
    const resolved = await SaasApiKeyService.resolve(bearerToken, method === 'GET' ? 'read' : 'write');
    tenantId = resolved.organizationId; actorId = resolved.userId; sessionRole = resolved.role;
    keyPrefix = 'managed_key'; keyName = resolved.keyId;
    if (resolved.scopes.includes('write') && canManageWorkspace(resolved.role)) scopes = ['full_access'];
    else scopes = ['accounts:read','analytics:read','telephony:read',
      ...(resolved.scopes.includes('write') && resolved.role === 'editor' ? ['posts:write','inbox:write','telephony:write'] as ApiKeyScope[] : [])];
  } else {
    try {
      const { session, role } = await requireTenantAccess(req, req.nextUrl.searchParams.get('organizationId'));
      sessionRole = role;
      tenantId = session.tenant.organizationId;
      actorId = session.user.id;
      const managesWorkspace = canManageWorkspace(role);
      const sensitiveRoute = ['api-keys', 'keys', 'webhooks', 'wallet', 'billing'].includes(path[0]);
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const editorAction = ['posts', 'queue', 'inbox', 'messages', 'contacts', 'segments', 'custom-fields', 'phone-lifecycle', 'phone-numbers', 'sms', 'voice'].includes(path[0]) ||
        isWhatsAppLifecyclePath(path) ||
        ['/media/presign', '/validate/post', '/validate/media'].includes(routeKey);
      if (!managesWorkspace && (sensitiveRoute || (mutation && !(role === 'editor' && editorAction)))) {
        throw new TenantAccessError(403, 'Your workspace role does not permit this action.');
      }
      scopes = managesWorkspace ? ['full_access'] : ['accounts:read', 'analytics:read', 'telephony:read',
        ...(role === 'editor' ? ['posts:write', 'inbox:write', 'telephony:write'] as ApiKeyScope[] : [])];
    } catch (error) {
      const status = error instanceof TenantAccessError ? error.status : 503;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'authorization_unavailable',
            message: error instanceof TenantAccessError ? error.message : 'Workspace authorization is unavailable.',
            docs_url: `${baseUrl}/docs#authentication`,
          },
        },
        { status, headers: getRateLimitHeaders('anonymous', 30) }
      );
    }
  }

  const unavailable = unavailablePublicFeature(path);
  if (unavailable) return NextResponse.json({ success: false, error: { code: 'feature_unavailable', message: unavailable } }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
  const policy = await resolveEffectiveTenantPolicy(tenantId);
  if (policy.status !== 'active') {
    return NextResponse.json({ success: false, error: { code: 'workspace_unavailable', message: 'This workspace is unavailable.' } },
      { status: 403, headers: getRateLimitHeaders(tenantId, 30) });
  }

  const planRateLimit = policy.planKey === 'enterprise' ? 1200 : policy.planKey === 'growth' ? 300 : 120;
  const headers = getRateLimitHeaders(tenantId, planRateLimit);

  // Parse body if POST / PUT / PATCH / DELETE
  let body: Record<string, any> = {};
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const text = await req.text();
      if (text.length > 2_000_000) throw new TenantAccessError(413, 'Request is too large.');
      if (text) body = JSON.parse(text);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object.');
    } catch (error) {
      if (error instanceof TenantAccessError) throw error;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'invalid_json',
            message: 'Request body must be valid JSON.',
          },
        },
        { status: 400, headers }
      );
    }
  }

  const idempotencyKey =
    req.headers.get('idempotency-key') ||
    req.headers.get('x-idempotency-key') ||
    '';
  const accountLifecyclePath = path[0] === 'accounts';
  const commentsPath = path[0] === 'inbox' && path[1] === 'comments';
  const retiredMetaSettingsPath = path[0] === 'account-settings' && ['messenger-menu','messenger-greeting','messenger-ice-breakers','instagram-ice-breakers'].includes(path[1]);
  const respond = (status:number,payload:Record<string,any>,_requestSummary?:string,_responseSummary?:string) => NextResponse.json({
    ...payload,meta:{...payload.meta,api_version:'2026-10-20',latency_ms:Math.max(0,Date.now()-startMs),organization_id:tenantId},
  },{status,headers});
  if (body.organizationId && body.organizationId !== tenantId) throw new TenantAccessError(403,'This workspace is not accessible.');
  if (req.nextUrl.searchParams.get('organizationId') && req.nextUrl.searchParams.get('organizationId') !== tenantId) throw new TenantAccessError(403,'This workspace is not accessible.');
  if (method !== 'GET' && !canManageWorkspace(sessionRole!) && sessionRole !== 'editor') throw new TenantAccessError(403,'Your current role does not permit changes.');
  const launchInput = {...Object.fromEntries(req.nextUrl.searchParams),...body,idempotencyKey:idempotencyKey||body.idempotencyKey};
  const launchResult = await runLaunchPublicApi({organizationId:tenantId,userId:actorId,role:sessionRole!},method,path,launchInput);
  if (launchResult !== null) return respond(launchResult.httpStatus||200,{success:true,...launchResult});

  const denyScope = (required: ApiKeyScope) =>
    respond(
      403,
      {
        success: false,
        error: {
          code: 'insufficient_scope',
          message: `This API key (${keyPrefix}) does not have the required '${required}' permission scope.`,
          required_scope: required,
          active_scopes: scopes,
        },
      },
      undefined,
      `Forbidden: missing scope ${required}`
    );

  if (retiredMetaSettingsPath) {
    return respond(501, { success: false, error: { code: 'operation_unavailable', message: 'Use /accounts/{accountId}/{setting} to read or change provider messaging settings.' } });
  }

  if (isMetaSettingsPath(path) || isMetaThreadControlPath(path)) {
    const scope = isMetaThreadControlPath(path) ? 'inbox:write' : method === 'GET' ? 'accounts:read' : 'accounts:write';
    if (!hasScope(scopes, scope)) return denyScope(scope);
    try {
      const result = await runMetaSettingsPublicApi(tenantId, method, path, { ...Object.fromEntries(req.nextUrl.searchParams), ...body, value: body });
      return respond(result.httpStatus, result, 'Provider messaging settings');
    } catch (error) {
      const failure = inboxError(error);
      return respond(failure.status, failure.payload, 'Provider messaging settings');
    }
  }

  if (accountLifecyclePath && !isPublishingPath(path)) {
    const scope = method === 'GET' ? 'accounts:read' : 'accounts:write';
    if (!hasScope(scopes, scope)) return denyScope(scope);
    try {
      if (method === 'DELETE' && path.length === 2 && path[1] !== 'health') {
        return respond(200, await disconnectAccount(tenantId, path[1]), 'Disconnect provider account');
      }
      if (method !== 'GET') throw new TenantAccessError(501, 'Use authenticated account onboarding for this operation.');
      if (path.length > 2 && !(path.length === 3 && path[2] === 'health')) {
        throw new TenantAccessError(501, 'This account setting is not implemented.');
      }
      const state = await CoreConnectService.listTenantAccountsWithHealth(tenantId);
      if (path.length === 1 || (path.length === 2 && path[1] === 'health')) {
        return respond(200, { success: true, ...state, count: state.accounts.length, data: state.accounts }, 'Read provider account state');
      }
      const account = state.accounts.find(item => item.accountId === path[1]);
      if (!account) throw new TenantAccessError(404, 'Account not found in this workspace.');
      return respond(200, { success: true, ...account, data: account }, 'Read provider account state');
    } catch (error) {
      const failure = publishingError(error);
      return respond(failure.status, failure.payload, 'Provider account operation');
    }
  }

  if (isPublishingPath(path)) {
    if (method === 'GET') {
      if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'posts:write')) return denyScope('accounts:read');
    } else if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
    try {
      const input = { ...Object.fromEntries(req.nextUrl.searchParams), ...body, idempotencyKey: idempotencyKey || body.idempotencyKey };
      const result = await runPublishingPublicApi(tenantId, method, path, input);
      return respond(result.httpStatus || 200, result, 'Publishing provider operation');
    } catch (error) {
      const failure = publishingError(error);
      return respond(failure.status, failure.payload, 'Publishing provider operation');
    }
  }

  // Comment moderation always checks canonical provider ownership before mutation.
  if (commentsPath) {
    if (method === 'GET') {
      if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'inbox:write')) return denyScope('accounts:read');
    } else if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
    try {
      const input = { ...Object.fromEntries(req.nextUrl.searchParams), ...body, idempotencyKey: idempotencyKey || body.idempotencyKey };
      const result = await runMetaCommentsPublicApi(tenantId, method, path, input);
      return respond(result.httpStatus, result, 'Provider comment moderation');
    } catch (error) { const failure = inboxError(error); return respond(failure.status, failure.payload, 'Provider comment moderation'); }
  }

  // Messaging uses verified provider accounts and state; never replay older synthetic results.
  if (isWhatsAppLifecyclePath(path) || routeKey === '/inbox/messages') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'telephony:read')) return denyScope('accounts:read');
    } else if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
    try {
      const input = { ...Object.fromEntries(req.nextUrl.searchParams), ...body, idempotencyKey: idempotencyKey || body.idempotencyKey };
      const targetPath = ['/inbox/messages', '/messages/send'].includes(routeKey) ? ['inbox', 'reply'] : path;
      const result = await runInboxPublicApi(tenantId, method, targetPath, input, { allowMeta: hasScope(scopes, 'accounts:read') || hasScope(scopes, 'inbox:write') });
      return respond(result.httpStatus, result, 'Inbox provider operation');
    } catch (error) {
      const failure = inboxError(error);
      return respond(failure.status, failure.payload, 'Inbox provider operation');
    }
  }

  if (method === 'GET' && routeKey === '/me') return respond(200, { success: true, data: {
    workspace: { organizationId: tenantId, organizationName: policy.organizationName, planKey: policy.planKey },
    auth: { keyName, keyPrefix, scopes }, customerPayments: 'coming_soon',
    limits: { configured: policy.quotas, monthlyPostEnforcement: 'coming_soon', connectedAccountEnforcement: 'coming_soon' },
  } });
  if (path[0] === 'workspaces' || path[0] === 'admin') return respond(404, {success:false,error:{code:'endpoint_not_found',message:'This endpoint is not available.'}});
  return respond(501, { success:false,error:{code:'feature_unavailable',message:'This operation is not implemented in the current release. Use the supported dashboard workflow.'} });
  } catch (error) {
    const failure = inboxError(error);
    return NextResponse.json(failure.payload, { status: failure.status, headers: getRateLimitHeaders('unavailable') });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
