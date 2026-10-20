import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { TenantAccessError } from '@/lib/auth/tenant-access';

export type AudienceSnapshot = { phones: string[]; contactIds: string[]; evidence: unknown[] };
export type Campaign = { id: string; organization_id: string; created_by: string | null; account_id: string; name: string;
  template: { name: string; language: string; components?: Record<string, unknown>[]; variableMapping?: Record<string, { field: 'custom'; customValue: string }> };
  contact_ids: string[]; audience_snapshot: AudienceSnapshot; audience_hash: string; status: string; scheduled_at: string | null;
  provider_id: string | null; reservation_id: string | null; operation_token: string | null; step: string | null;
  result: Record<string, unknown> | null; error: string | null; revision: number; created_at: string; updated_at: string };
export function campaignDb() { const db = createSupabaseAdminClient(); if (!db) throw new TenantAccessError(503, 'Campaign storage is unavailable.'); return db; }
function unavailable(): never { throw new TenantAccessError(503, 'Campaign storage could not confirm this operation. Refresh before retrying.'); }
export const CampaignStore = {
  async list(organizationId: string, skip = 0) {
    const { data, error } = await campaignDb().from('asra3_campaigns').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).range(skip, skip + 24);
    if (error || !data) unavailable(); return data as Campaign[];
  },
  async get(organizationId: string, id: string) {
    const { data, error } = await campaignDb().from('asra3_campaigns').select('*').eq('organization_id', organizationId).eq('id', id).maybeSingle();
    if (error) unavailable(); if (!data) throw new TenantAccessError(404, 'Campaign not found.'); return data as Campaign;
  },
  async create(value: Partial<Campaign>) {
    const { data, error } = await campaignDb().from('asra3_campaigns').insert(value).select('*').single();
    if (error || !data) unavailable(); return data as Campaign;
  },
  async edit(organizationId: string, id: string, revision: number, value: Partial<Campaign>) {
    const { data, error } = await campaignDb().from('asra3_campaigns').update({ ...value, revision: revision + 1, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', id).eq('revision', revision).is('operation_token', null).select('*').maybeSingle();
    if (error) unavailable(); if (!data) throw new TenantAccessError(409, 'The campaign changed. Refresh and review it again.'); return data as Campaign;
  },
  async claim(organizationId: string, id: string, token: string) {
    const { data, error } = await campaignDb().rpc('claim_asra3_campaign', { p_organization_id: organizationId, p_id: id, p_token: token });
    if (error) unavailable(); if (!data) throw new TenantAccessError(409, 'This campaign is already processing, not due, or requires review.'); return data as Campaign;
  },
  async progress(campaign: Campaign, token: string, value: Partial<Campaign>) {
    const { data, error } = await campaignDb().from('asra3_campaigns').update({ ...value, updated_at: new Date().toISOString() }).eq('organization_id', campaign.organization_id).eq('id', campaign.id).eq('operation_token', token).select('*').maybeSingle();
    if (error || !data) unavailable(); return data as Campaign;
  },
  async delete(campaign: Campaign) {
    const { data, error } = await campaignDb().from('asra3_campaigns').delete().eq('organization_id', campaign.organization_id).eq('id', campaign.id).eq('status', 'draft').eq('revision', campaign.revision).is('provider_id', null).is('operation_token', null).select('id');
    if (error) unavailable(); if (!data?.length) throw new TenantAccessError(409, 'Only an unchanged local draft can be deleted.');
  },
};
