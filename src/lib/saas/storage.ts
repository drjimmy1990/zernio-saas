import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { TenantAccessError } from '@/lib/auth/tenant-access';

/** Security and spending never fall back to an anonymous client or local JSON. */
export function saasDatabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new TenantAccessError(503, 'SaaS security storage is unavailable.');
  const client = createSupabaseAdminClient();
  if (!client) throw new TenantAccessError(503, 'SaaS security storage is unavailable.');
  return client;
}
export async function saasRpc<T = Record<string, any>>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await saasDatabase().rpc(name, parameters);
  if(error?.code==='42501')throw new TenantAccessError(403,'This workspace action is not permitted.');
  if(error?.code==='22023'||error?.code==='23514')throw new TenantAccessError(400,'Invalid SaaS operation.');
  if(error?.code==='P0001')throw new TenantAccessError(409,'This workspace operation cannot be completed. Check the current member, invitation or policy state.');
  if (error || data == null) throw new TenantAccessError(503, 'The durable SaaS operation could not be confirmed.');
  if (data.error_code) throw new TenantAccessError(Number(data.status) || 409, data.message || data.error_code);
  return data as T;
}
