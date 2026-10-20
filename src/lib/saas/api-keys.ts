import { createHash, randomBytes } from 'node:crypto';
import { TenantAccessError, type TenantRole } from '@/lib/auth/tenant-access';
import { saasDatabase,saasRpc } from './storage';

export const API_KEY_SCOPES = ['read', 'write'] as const;
export interface ResolvedSaasApiKey { organizationId: string; userId: string; role: TenantRole; scopes: string[]; keyId: string }
export class SaasApiKeyService {
  static async list(organizationId: string) {
    const { data, error } = await saasDatabase().from('saas_api_keys').select('id,name,prefix,scopes,expires_at,revoked_at,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (error || !data) throw new TenantAccessError(503, 'API keys could not be loaded.');
    return { keys: data };
  }
  static async resolve(token: string, requiredScope?: 'read' | 'write'): Promise<ResolvedSaasApiKey> {
    if (typeof token !== 'string' || !/^asra3_[a-f0-9]{64}$/.test(token)) throw new TenantAccessError(401, 'Invalid or retired API key. Create a new workspace key.');
    const result = await saasRpc<ResolvedSaasApiKey>('saas_resolve_api_key', { p_hash: createHash('sha256').update(token).digest('hex'), p_scope: requiredScope ?? null });
    if (!result.organizationId || !result.userId || !result.keyId || !['owner','admin','editor','viewer'].includes(result.role) || !Array.isArray(result.scopes)) throw new TenantAccessError(503, 'API key verification is unavailable.');
    const identity=await saasDatabase().auth.admin.getUserById(result.userId);
    if(identity.error)throw new TenantAccessError(503,'API key issuer verification is unavailable.');
    if(!identity.data.user?.email_confirmed_at)throw new TenantAccessError(403,'API key issuer email is not verified.');
    return result;
  }
  static async create(params: { organizationId: string; actorId: string; name: string; scopes: ('read' | 'write')[]; expiresAt: string }) {
    if (!params.name?.trim() || params.name.length > 100 || !Array.isArray(params.scopes) || !params.scopes.length || params.scopes.some(s => !API_KEY_SCOPES.includes(s))) throw new TenantAccessError(400, 'A name and explicit read/write scopes are required.');
    const expiry = Date.parse(params.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 366 * 86400000) throw new TenantAccessError(400, 'API keys must expire within one year.');
    const token = `asra3_${randomBytes(32).toString('hex')}`;
    const key = await saasRpc('saas_create_api_key', { p_organization_id: params.organizationId, p_actor_id: params.actorId, p_name: params.name.trim(), p_scopes: [...new Set(params.scopes)], p_expires_at: new Date(expiry).toISOString(), p_prefix: token.slice(0, 14), p_hash: createHash('sha256').update(token).digest('hex') });
    return { key, token, message: 'Save this key now. It is shown once.' };
  }
  static async revoke(params: { organizationId: string; actorId: string; keyId: string }) {
    return saasRpc<boolean>('saas_revoke_api_key', { p_organization_id: params.organizationId, p_actor_id: params.actorId, p_key_id: params.keyId });
  }
}
