import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SESSION_COOKIE_NAME, SESSION_SECRET, type AuthSession } from '@/lib/auth/session';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { verifyReconnectIdentity } from '@/lib/accounts/lifecycle';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import { getOwnedPhoneNumberForWhatsApp } from '@/lib/telephony/phone-numbers';
import { ZernioApiException } from '@/lib/zernio/client';
import type { SecondarySelectionStep, SocialPlatform } from '@/types/platform';

const STEP_PLATFORM: Record<string, SocialPlatform> = {
  select_page: 'facebook', select_organization: 'linkedin', select_board: 'pinterest',
  select_location: 'googlebusiness', select_public_profile: 'snapchat',
  select_phone_number: 'whatsapp', select_account: 'instagram',
};
type Resource = { id: string; name: string; username: string; category: string; details: string; instagramAccountId?: string; wabaId?: string };
type Context = { loginMethod?: 'instagram_login' | 'facebook_login'; reconnectAccountId?: string; expectedPlatformUserId?: string; tempToken?: string; userProfile?: Record<string, unknown>; connectToken?: string; accountId?: string; resources?: Resource[] };
type OAuthRow = {
  id: string; organization_id: string; user_id: string; session_hash: string;
  platform: SocialPlatform; profile_id: string; redirect_url: string; expires_at: string;
  status: 'pending' | 'selecting' | 'processing' | 'consumed' | 'failed';
  selection_step?: SecondarySelectionStep; encrypted_context: string | null;
  expected_phone_number?: string | null;
  purchased_number_id?: string | null;
};

function database() {
  const db = createSupabaseAdminClient();
  if (!db || !SESSION_SECRET) throw new TenantAccessError(503, 'Secure account connection storage is unavailable.');
  return db;
}

function binding(request: Request) {
  const token = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!token) throw new TenantAccessError(401, 'Sign in again before connecting an account.');
  return createHash('sha256').update(token).digest('hex');
}

export function encryptOAuthContext(value: Context, nonce: string): string {
  if (!SESSION_SECRET) throw new TenantAccessError(503, 'Secure account connection storage is unavailable.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(SESSION_SECRET).digest(), iv);
  cipher.setAAD(Buffer.from(nonce));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptOAuthContext(value: string, nonce: string): Context {
  try {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const cipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(SESSION_SECRET).digest(), iv);
    cipher.setAAD(Buffer.from(nonce));
    cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8'));
  } catch {
    throw new TenantAccessError(503, 'The authorization context could not be read. Restart the connection.');
  }
}

async function read(request: Request, session: AuthSession, nonce: unknown, platform: string): Promise<OAuthRow> {
  if (typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce)) {
    throw new TenantAccessError(400, 'Restart the connection to obtain a valid authorization session.');
  }
  const { data, error } = await database().from('oauth_sessions').select('*').eq('id', nonce).maybeSingle();
  if (error) throw new TenantAccessError(503, 'Secure account connection storage is unavailable.');
  if (!data || data.organization_id !== session.tenant.organizationId || data.user_id !== session.user.id ||
      data.session_hash !== binding(request) || data.platform !== platform) {
    throw new TenantAccessError(403, 'This authorization session does not belong to your current workspace and sign-in.');
  }
  if (Date.parse(data.expires_at) <= Date.now()) throw new TenantAccessError(410, 'Authorization expired. Restart the connection.');
  if (['consumed', 'failed', 'processing'].includes(data.status)) throw new TenantAccessError(409, 'This authorization has already been used. Restart the connection.');
  const profile = await CoreConnectService.ensureTenantProfile(session.tenant.organizationId);
  if (profile !== data.profile_id) throw new TenantAccessError(409, 'The workspace profile changed. Restart the connection.');
  return data as OAuthRow;
}

async function transition(row: OAuthRow, expected: OAuthRow['status'], update: Partial<OAuthRow>) {
  const { data, error } = await database().from('oauth_sessions').update(update)
    .eq('id', row.id).eq('status', expected).gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
  if (error) throw new TenantAccessError(503, 'Could not save the authorization session.');
  if (!data) throw new TenantAccessError(409, 'This authorization has already been used or expired. Restart the connection.');
}

export async function startOAuthSession(request: Request, session: AuthSession,
  params: Omit<Parameters<typeof CoreConnectService.startHeadlessOAuth>[0], 'organizationId' | 'redirectUrl'>,
  expectedPhoneNumber?: string, purchasedNumberId?: string) {
  if (expectedPhoneNumber && !/^\+[1-9]\d{7,14}$/.test(expectedPhoneNumber)) {
    throw new TenantAccessError(502, 'The provider did not return a valid purchased phone number.');
  }
  const profileId = await CoreConnectService.ensureTenantProfile(session.tenant.organizationId);
  const reconnect = params.reconnectAccountId
    ? await verifyReconnectIdentity(session.tenant.organizationId, params.reconnectAccountId, params.platform) : undefined;
  const nonce = randomBytes(32).toString('hex');
  const callback = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || request.url);
  callback.searchParams.set('asra3_oauth_state', nonce);
  if (reconnect) callback.searchParams.set('reconnectAccountId', reconnect.reconnectAccountId);
  const row: OAuthRow = {
    id: nonce, organization_id: session.tenant.organizationId, user_id: session.user.id,
    session_hash: binding(request), platform: params.platform, profile_id: profileId,
    redirect_url: callback.toString(), expires_at: new Date(Math.min(Date.now() + 15 * 60_000, session.expiresAt)).toISOString(),
    status: 'pending', encrypted_context: reconnect || params.platform === 'instagram' ? encryptOAuthContext({ ...reconnect, ...(params.platform === 'instagram' ? { loginMethod: reconnect?.loginMethod || params.loginMethod || 'instagram_login' } : {}) }, nonce) : null, expected_phone_number: expectedPhoneNumber || null,
    purchased_number_id: purchasedNumberId || null,
  };
  const { error } = await database().from('oauth_sessions').insert(row);
  if (error) throw new TenantAccessError(503, 'Secure account connection storage is unavailable.');
  try {
    const result = await CoreConnectService.startHeadlessOAuth({ ...params, organizationId: session.tenant.organizationId, redirectUrl: callback.toString() });
    const authUrl = new URL(result.authUrl);
    if (result.simulated || authUrl.protocol !== 'https:' || authUrl.username || authUrl.password) {
      throw new ZernioApiException({ status: 502, error: 'The provider did not return a secure authorization URL.' });
    }
    return { authUrl: authUrl.toString(), oauthSessionId: nonce, platform: params.platform, simulated: false };
  } catch (error) {
    await transition(row, 'pending', { status: 'failed', encrypted_context: null });
    throw error;
  }
}

export async function acceptOAuthCallback(request: Request, session: AuthSession, body: Record<string, unknown>) {
  const row = await read(request, session, body.oauthSessionId, String(body.platform || ''));
  if (row.status !== 'pending') throw new TenantAccessError(409, 'This callback has already been accepted.');
  if (body.error) {
    await transition(row, 'pending', { status: 'failed', encrypted_context: null });
    const canceled = ['connection_cancelled', 'access_denied'].includes(String(body.error));
    throw new TenantAccessError(400, canceled ? 'Authorization was canceled. Restart when you are ready.' : 'The provider could not authorize the connection. Check Meta permissions and number ownership, then retry.');
  }
  if (body.profileId !== row.profile_id) throw new TenantAccessError(403, 'The callback profile does not match your workspace.');
  const step = typeof body.step === 'string' ? body.step : '';
  if (step) {
    const saved = row.encrypted_context ? decryptOAuthContext(row.encrypted_context, row.id) : {};
    if (row.platform === 'instagram' && saved.loginMethod !== 'facebook_login') throw new TenantAccessError(400, 'Direct Instagram Login does not use a Facebook Page picker.');
    if (STEP_PLATFORM[step] !== row.platform || typeof body.tempToken !== 'string' || !body.tempToken.trim() || body.tempToken.startsWith('sim_')) {
      throw new TenantAccessError(400, 'The provider returned an invalid selection session. Restart the connection.');
    }
    let userProfile: Record<string, unknown> | undefined;
    if (body.userProfile != null) {
      try {
        let parsed = body.userProfile;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); }
          catch { parsed = JSON.parse(decodeURIComponent(parsed as string)); }
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        userProfile = parsed as Record<string, unknown>;
      } catch { throw new TenantAccessError(400, 'The provider returned an invalid user profile. Restart the connection.'); }
    }
    const savedContext = row.encrypted_context ? decryptOAuthContext(row.encrypted_context, row.id) : {};
    const context = { ...savedContext, tempToken: body.tempToken, userProfile,
      ...(typeof body.connect_token === 'string' ? { connectToken: body.connect_token } : {}) };
    await transition(row, 'pending', { status: 'selecting', selection_step: step as SecondarySelectionStep, encrypted_context: encryptOAuthContext(context, row.id) });
    return { oauthSessionId: row.id, platform: row.platform, step, selectionRequired: true };
  }
  if (typeof body.accountId !== 'string' || !body.accountId) throw new TenantAccessError(400, 'The provider did not confirm a connected account.');
  await transition(row, 'pending', { status: 'processing' });
  return finish(row, body.accountId);
}

export function normalizeOAuthResources(raw: Record<string, unknown>, platform: string): Resource[] {
  const list = ['pages', 'organizations', 'boards', 'locations', 'profiles', 'numbers', 'phoneNumbers', 'accounts', 'items']
    .map((key) => raw[key]).find(Array.isArray) as Array<Record<string, unknown>> | undefined;
  return (list || []).map((item) => ({
    ...(platform === 'instagram' && item.instagram_business_account && typeof item.instagram_business_account === 'object' ? { instagramAccountId: String((item.instagram_business_account as Record<string, unknown>).id || '') } : {}),
    id: String(item.phone_number_id || item.phoneNumberId || item.id || item.pageId || item.locationId || item.boardId || item.organizationId || item._id || ''),
    name: String(item.verified_name || item.verifiedName || item.name || item.displayName || item.title || item.username || 'Account'),
    username: String(item.display_phone_number || item.displayPhoneNumber || item.phoneNumber || item.username || ''),
    category: String(item.category || platform.toUpperCase()), details: String(item.wabaName || item.address || item.about || ''),
    ...(typeof (item.wabaId || item.waba_id) === 'string' ? { wabaId: String(item.wabaId || item.waba_id) } : {}),
  })).filter((item) => item.id && (platform !== 'whatsapp' || item.wabaId) && (platform !== 'instagram' || item.instagramAccountId));
}

export async function listOAuthResources(request: Request, session: AuthSession, nonce: unknown, platform: string) {
  const row = await read(request, session, nonce, platform);
  if (row.status !== 'selecting' || !row.encrypted_context || !row.selection_step) throw new TenantAccessError(409, 'Accept the provider callback before selecting an account.');
  const context = decryptOAuthContext(row.encrypted_context, row.id);
  const result = await CoreConnectService.listHeadlessSelectableEntities({ organizationId: row.organization_id,
    step: row.selection_step, tempToken: context.tempToken!, connectToken: context.connectToken });
  const items = normalizeOAuthResources(result.raw || {}, row.platform)
    .filter((item) => !row.expected_phone_number || normalizePhone(item.username) === normalizePhone(row.expected_phone_number));
  await transition(row, 'selecting', { encrypted_context: encryptOAuthContext({ ...context, resources: items }, row.id) });
  return { items, platform: row.platform, step: row.selection_step, simulated: false };
}

export async function completeOAuthSelection(request: Request, session: AuthSession, body: Record<string, unknown>) {
  const row = await read(request, session, body.oauthSessionId, String(body.platform || ''));
  if (row.status !== 'selecting' || !row.encrypted_context || !row.selection_step) throw new TenantAccessError(409, 'Accept the provider callback before selecting an account.');
  const context = decryptOAuthContext(row.encrypted_context, row.id);
  const chosen = context.resources?.find((item) => item.id === body.entityId && (row.platform !== 'whatsapp' || item.wabaId === body.wabaId));
  if (!chosen) throw new TenantAccessError(400, 'Choose an account from the verified resource list, including its WhatsApp Business Account.');
  if (context.reconnectAccountId && row.platform === 'facebook' && chosen.id !== context.expectedPlatformUserId) {
    throw new TenantAccessError(409, 'Reconnect the original Facebook Page. Disconnect and connect again to switch Pages.');
  }
  if (context.reconnectAccountId && row.platform === 'instagram' && chosen.instagramAccountId !== context.expectedPlatformUserId) {
    throw new TenantAccessError(409, 'Reconnect the original Instagram account. Disconnect and connect again to switch accounts.');
  }
  await transition(row, 'selecting', { status: 'processing' });
  let accountId: string;
  try {
    const result = await CoreConnectService.completeHeadlessSelection({ organizationId: row.organization_id,
      step: row.selection_step, entityId: chosen.id, wabaId: chosen.wabaId, tempToken: context.tempToken!,
      userProfile: context.userProfile, connectToken: context.connectToken, redirectUrl: row.redirect_url });
    const account = (result as { account?: Record<string, unknown> }).account;
    const returnedId = account?._id || account?.accountId;
    if (typeof returnedId !== 'string' || !returnedId) throw new ZernioApiException({ status: 502, error: 'The provider did not confirm a connected account.' });
    accountId = returnedId;
  } catch (error) {
    await transition(row, 'processing', { status: 'failed', encrypted_context: null });
    throw error;
  }
  return finish(row, accountId);
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

async function finish(row: OAuthRow, accountId: string) {
  let account: { id: string; accountId: string; platform: string; username: string; displayName: string; status: string; syncTime: string; needsReconnect: boolean };
  try {
    if (row.purchased_number_id) {
      const owned = await getOwnedPhoneNumberForWhatsApp(row.organization_id, row.purchased_number_id);
      if (normalizePhone(owned.phoneNumber) !== normalizePhone(row.expected_phone_number || '')) {
        throw new TenantAccessError(409, 'The purchased number changed. Restart the connection.');
      }
      if (owned.socialAccountId && owned.socialAccountId !== accountId) {
        throw new TenantAccessError(409, 'The purchased number is linked to a different WhatsApp account. Refresh your workspace.');
      }
    }
    const reconnect = row.encrypted_context ? decryptOAuthContext(row.encrypted_context, row.id) : {};
    if (reconnect.reconnectAccountId && accountId !== reconnect.reconnectAccountId) {
      throw new TenantAccessError(409, 'The provider connected a different account. Refresh accounts before retrying.');
    }
    const [verified] = await requireTenantAccounts(row.organization_id, [accountId]);
    const identity = verified as typeof verified & { platformUserId?: string; metadata?: { instagramScopedId?: string; loginMethod?: string } };
    if (row.platform === 'instagram' && reconnect.loginMethod && (identity.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' : 'instagram_login') !== reconnect.loginMethod) {
      throw new TenantAccessError(409, 'The provider returned a different Instagram login method.');
    }
    if (reconnect.expectedPlatformUserId && ![identity.platformUserId, row.platform === 'instagram' ? identity.metadata?.instagramScopedId : undefined].includes(reconnect.expectedPlatformUserId)) {
      throw new TenantAccessError(409, 'The provider returned a different platform identity.');
    }
    if (verified.platform !== row.platform || !verified.isActive || verified.needsReconnection) {
      throw new TenantAccessError(409, 'The provider has not confirmed an active connection for this platform. Restart the connection.');
    }
    const canonical = verified as typeof verified & { phoneNumber?: string; selectedPhoneNumber?: string };
    if (row.expected_phone_number && normalizePhone(canonical.phoneNumber || canonical.selectedPhoneNumber || canonical.username || '') !== normalizePhone(row.expected_phone_number)) {
      throw new TenantAccessError(409, 'Meta connected a different number. Restart and choose your purchased number.');
    }
    account = { id: verified._id, accountId: verified._id, platform: verified.platform,
      ...(row.platform === 'instagram' ? { loginMethod: identity.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' as const : 'instagram_login' as const } : {}),
      username: verified.username || '', displayName: verified.displayName || verified.username || '',
      status: 'active', syncTime: 'Just now', needsReconnect: false };
  } catch (error) {
    await transition(row, 'processing', { status: 'failed', encrypted_context: null });
    throw error;
  }
  await transition(row, 'processing', { status: 'consumed', encrypted_context: null });
  try { WorkspaceStore.addConnectedAccount(row.organization_id, account); }
  catch { throw new TenantAccessError(503, 'The provider confirmed your connection, but the dashboard could not refresh it. Refresh your workspace before reconnecting.'); }
  return { success: true, simulated: false, account };
}
