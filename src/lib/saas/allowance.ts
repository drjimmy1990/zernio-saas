import { createHash } from 'node:crypto';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { saasRpc } from './storage';

export const SPENDING_CAPABILITIES = ['phone_purchase', 'phone_rental', 'sms_send', 'voice_call', 'whatsapp_send', 'campaign_send'] as const;
export type SpendingCapability = typeof SPENDING_CAPABILITIES[number];
export interface AllowanceReservation { reservationId: string; state: 'reserved' | 'settled' | 'released'; amountMinor: number; currency: 'USD'; replayed: boolean; quoteSource: string }
function minor(value: number) { if (!Number.isSafeInteger(value) || value < 0) throw new TenantAccessError(400, 'Use nonnegative integer minor units.'); }
function operation(value: string) { if (typeof value !== 'string' || !value.trim() || value.length > 255) throw new TenantAccessError(400, 'A stable spending operation key is required.'); }
function capability(value: string) { if (!SPENDING_CAPABILITIES.includes(value as SpendingCapability)) throw new TenantAccessError(400, 'Unknown spending capability.'); }
function reservation(data: Record<string, any>): AllowanceReservation {
  if (!data.reservationId || !['reserved','settled','released'].includes(data.state) || !Number.isSafeInteger(data.amountMinor) || data.amountMinor < 0 || data.currency !== 'USD') throw new TenantAccessError(503, 'Allowance reservation was not confirmed.');
  return data as AllowanceReservation;
}
export class SaasAllowanceService {
  static async assertCapability(params: { organizationId: string; capability: SpendingCapability }) {
    capability(params.capability); return saasRpc<{ enabled: boolean; unitCeilingMinor: number | null; maxUnitsPerOperation: number | null }>('saas_spending_capability', { p_organization_id: params.organizationId, p_capability: params.capability });
  }
  static async reserve(params: { organizationId: string; capability: SpendingCapability; operationKey: string; amountMinor: number; currency?: 'USD'; quoteSource: string; providerResourceId?: string }) {
    capability(params.capability); operation(params.operationKey); minor(params.amountMinor);
    if (params.currency && params.currency !== 'USD' || typeof params.quoteSource !== 'string' || !params.quoteSource.trim()) throw new TenantAccessError(400, 'A verified quote source and USD allowance are required.');
    return reservation(await saasRpc('saas_reserve_allowance', { p_organization_id: params.organizationId, p_capability: params.capability, p_operation_key: params.operationKey, p_amount_minor: params.amountMinor, p_quote_source: params.quoteSource, p_provider_resource_id: params.providerResourceId ?? null, p_units: null }));
  }
  static async reserveUnits(params: { organizationId: string; capability: SpendingCapability; operationKey: string; units: number; intentFingerprint?: string }) {
    capability(params.capability); operation(params.operationKey);
    if (!Number.isSafeInteger(params.units) || params.units < 1) throw new TenantAccessError(400, 'A positive explicit unit count is required.');
    return reservation(await saasRpc('saas_reserve_allowance', { p_organization_id: params.organizationId, p_capability: params.capability, p_operation_key: params.operationKey, p_amount_minor: null, p_quote_source: 'admin spending allocation, not provider quote', p_provider_resource_id: null, p_units: params.units, p_intent_fingerprint: params.intentFingerprint ?? null }));
  }
  static async settle(params: { organizationId: string; reservationId: string; actualAmountMinor: number; providerReference: string; evidence: Record<string, unknown> }) {
    minor(params.actualAmountMinor);
    if (!params.providerReference || !params.evidence || !Object.keys(params.evidence).length) throw new TenantAccessError(400, 'Provider evidence and reference are required for settlement.');
    return saasRpc('saas_finish_allowance', { p_organization_id: params.organizationId, p_reservation_id: params.reservationId, p_actual_minor: params.actualAmountMinor, p_provider_reference: params.providerReference, p_evidence: params.evidence, p_release_reason: null });
  }
  static async release(params: { organizationId: string; reservationId: string; reason: string; evidence: Record<string, unknown> }) {
    if (!params.reason?.trim() || !params.evidence || !Object.keys(params.evidence).length) throw new TenantAccessError(400, 'Evidence confirming no charge is required to release an allowance.');
    return saasRpc('saas_finish_allowance', { p_organization_id: params.organizationId, p_reservation_id: params.reservationId, p_actual_minor: null, p_provider_reference: null, p_evidence: params.evidence, p_release_reason: params.reason });
  }
  static async grant(params: { organizationId: string; actorId: string; amountMinor: number; operationKey: string; reason: string }) {
    minor(params.amountMinor); operation(params.operationKey);
    if (!params.reason?.trim()) throw new TenantAccessError(400, 'An allocation reason is required.');
    if(params.actorId!=='usr_super_admin')throw new TenantAccessError(403,'Only the platform administrator can allocate provider spending.');
    return saasRpc('saas_grant_allowance', { p_organization_id: params.organizationId, p_actor_id: params.actorId, p_amount_minor: params.amountMinor, p_operation_key: params.operationKey, p_reason: params.reason });
  }
  static operationKey(parts: unknown[]) { return createHash('sha256').update(JSON.stringify(parts)).digest('hex'); }
}
