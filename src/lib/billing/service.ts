import { createHash } from 'node:crypto';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { saasDatabase } from '@/lib/saas/storage';
import { PRICING, PRICING_VERSION, retailAmountMinor } from './pricing';
import { BillingWorkspaceService } from './workspace';

type Row = Record<string, any>;
type Kind = 'phone_rental' | 'voice_call' | 'sms_send';
const MAX_MINOR = 100_000_000;
function money(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > MAX_MINOR) throw new TenantAccessError(400, 'Use a supported amount in whole USD cents.');
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 255) throw new TenantAccessError(400, `${label} is required.`);
}
function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, stable(value[k])]));
  return value;
}
function fingerprint(input: Row) { return createHash('sha256').update(JSON.stringify(stable(input))).digest('hex'); }
async function checked(promise: PromiseLike<{ data: any; error: any }>): Promise<any> {
  const { data, error } = await promise;
  if (error) {
    if (error.code === 'P0001') throw new TenantAccessError(409, 'The balance, quote or billing operation changed. Refresh billing and reconcile the original reference before retrying.');
    throw new TenantAccessError(503, 'Customer billing storage is unavailable. No new paid action can be authorized.');
  }
  return data;
}
async function rpc(name: string, args: Row) {
  const result=await checked(saasDatabase().rpc(name, args));
  if(!result||typeof result!=='object'||Array.isArray(result))throw new TenantAccessError(503,'The billing transaction result is unknown. Reconcile the original reference before retrying.');
  return result;
}
function quoteView(q: Row) { return { id: q.id, amountMinor: q.amount_minor, currency: 'USD' as const, expiresAt: q.expires_at, pricingVersion: q.pricing_version }; }
async function quoteRow(organizationId: string, quoteId: string) {
  text(quoteId, 'Quote');
  const q = await checked(saasDatabase().from('billing_wallet_quotes').select('*').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle());
  if (!q) throw new TenantAccessError(404, 'The reviewed quote was not found in this workspace.');
  return q;
}
function validQuote(q: Row, operationKey: string, input: Row) {
  if (q.operation_key !== operationKey || q.fingerprint !== fingerprint(input) || q.pricing_version !== PRICING_VERSION || Date.parse(q.expires_at) <= Date.now()) throw new TenantAccessError(409, 'The quote expired or its details changed. Review a new quote with a new action reference.');
}
function nextMonth(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)); }

/** Customer retail money; never inferred from the separate administrator provider allowance. */
export class CustomerBillingService {
  static async createQuote(p: { organizationId: string; kind: Kind; operationKey: string; input: Row; providerCostMinor: number; quoteSource: string }) {
    await BillingWorkspaceService.assertSubscription(p.organizationId);
    money(p.providerCostMinor); text(p.operationKey, 'Operation reference'); text(p.quoteSource, 'Verified price source');
    const amount = retailAmountMinor(p.providerCostMinor); money(amount);
    if (!amount) throw new TenantAccessError(503, 'A verified positive retail price is required for this paid action.');
    const existing = await checked(saasDatabase().from('billing_wallet_quotes').select('*').eq('organization_id', p.organizationId).eq('operation_key', p.operationKey).maybeSingle());
    if (existing) {
      validQuote(existing, p.operationKey, p.input);
      if (existing.capability !== p.kind || existing.amount_minor !== amount) throw new TenantAccessError(409, 'The price changed. Review again using a new action reference.');
      return { ...quoteView(existing), providerCostMinor: p.providerCostMinor };
    }
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const result = await rpc('billing_create_quote', { p_org: p.organizationId, p_operation_key: p.operationKey, p_capability: p.kind, p_amount: amount, p_floor: p.kind === 'voice_call' ? PRICING.callMinimumBalanceMinor : p.kind === 'sms_send' ? PRICING.smsMinimumBalanceMinor : 0, p_expires_at: expiresAt, p_pricing_version: PRICING_VERSION, p_fingerprint: fingerprint(p.input) });
    return { id: result.quoteId, amountMinor: amount, currency: 'USD' as const, expiresAt, pricingVersion: PRICING_VERSION, providerCostMinor: p.providerCostMinor };
  }
  static async verifyQuote(p: { organizationId: string; quoteId: string; operationKey: string; input: Row; providerCostMinor: number }) {
    money(p.providerCostMinor);
    const q = await quoteRow(p.organizationId, p.quoteId); validQuote(q, p.operationKey, p.input);
    if (q.amount_minor !== retailAmountMinor(p.providerCostMinor)) throw new TenantAccessError(409, 'The supplier price changed. Review a new quote before spending.');
    return { ...quoteView(q), providerCostMinor: p.providerCostMinor };
  }
  static async reserveQuote(p: { organizationId: string; quoteId: string; operationKey: string; input: Row }) {
    await BillingWorkspaceService.assertSubscription(p.organizationId);
    const q = await quoteRow(p.organizationId, p.quoteId); validQuote(q, p.operationKey, p.input);
    return rpc('billing_reserve_wallet', { p_org: p.organizationId, p_quote: p.quoteId, p_operation_key: p.operationKey, p_fingerprint: fingerprint(p.input) });
  }
  static async settle(p: { organizationId: string; reservationId: string; actualProviderCostMinor: number | null; providerReference: string; evidence: Row; retailAmountMinor?: number }) {
    if (p.actualProviderCostMinor !== null) money(p.actualProviderCostMinor);
    const h = await checked(saasDatabase().from('billing_wallet_holds').select('*').eq('organization_id', p.organizationId).eq('id', p.reservationId).maybeSingle());
    if (!h) throw new TenantAccessError(404, 'Customer reservation was not found.');
    // SMS uses a reviewed fixed retail tariff; individual supplier cost remains unknown.
    const actual = p.retailAmountMinor ?? (p.actualProviderCostMinor === null ? null : retailAmountMinor(p.actualProviderCostMinor));
    money(actual);
    const charged = Math.min(actual, h.amount_minor);
    const result = await rpc('billing_finish_wallet', { p_org: p.organizationId, p_reservation: p.reservationId, p_retail_actual: charged, p_provider_cost: p.actualProviderCostMinor, p_provider_reference: p.providerReference, p_evidence: p.evidence, p_release_reason: null });
    return { ...result, amountMinor: charged, approvedAmountMinor: h.amount_minor };
  }
  static async release(p: { organizationId: string; reservationId: string; reason: string; evidence: Row }) {
    return rpc('billing_finish_wallet', { p_org: p.organizationId, p_reservation: p.reservationId, p_retail_actual: null, p_provider_cost: null, p_provider_reference: null, p_evidence: p.evidence, p_release_reason: p.reason });
  }
  static async verifiedSmsTariff(p: { organizationId: string; from: string; to: string }) {
    const rates: Row[] = await checked(saasDatabase().from('billing_sms_tariffs').select('*').gt('expires_at', new Date().toISOString()));
    const matching = rates.filter(r => p.from.startsWith(r.from_prefix) && p.to.startsWith(r.to_prefix)).sort((a,b) => b.to_prefix.length - a.to_prefix.length || b.from_prefix.length - a.from_prefix.length);
    const r = matching[0];
    if (!r || r.verified_by !== 'usr_super_admin' || r.evidence?.coversAllCarriers !== true || typeof r.evidence?.source !== 'string' || !r.evidence.source.trim()) throw new TenantAccessError(503, 'SMS sending is unavailable until a verified maximum supplier tariff covers this route. Published “from” prices are insufficient.');
    money(r.provider_ceiling_minor);
    return { id: r.id, version: r.version, expiresAt: r.expires_at, perSegmentUpperBoundProviderMinor: r.provider_ceiling_minor };
  }
  static assertIncomingSupported(): never { throw new TenantAccessError(501, 'Enabling incoming paid calls is unavailable until supplier charges and a prepaid spending cutoff can be enforced. Existing routes require administrator review.'); }
  static async bindRental(p: { organizationId: string; numberId: string; reservationId: string; providerCostMinor: number; monthlyRetailMinor: number; activationStatus: string; providerReference: string; evidence: Row; activatedAt?: string }) {
    if (p.activationStatus !== 'active') return { state: 'pending_activation' };
    money(p.providerCostMinor); money(p.monthlyRetailMinor);
    const chargeEvidence = { numberId: p.numberId, rentalActivation: true, monthlyRetailMinor: p.monthlyRetailMinor };
    await this.settle({ organizationId: p.organizationId, reservationId: p.reservationId, actualProviderCostMinor: p.providerCostMinor, providerReference: p.providerReference, evidence: chargeEvidence, retailAmountMinor: p.monthlyRetailMinor });
    const key = `number:${p.numberId}`;
    const existing = await checked(saasDatabase().from('billing_recurring_agreements').select('*').eq('organization_id', p.organizationId).eq('agreement_key', key).maybeSingle());
    if (existing) {
      if(existing.amount_minor!==p.monthlyRetailMinor||existing.resource_id!==p.numberId||existing.evidence.activationChargeReservation!==p.reservationId||existing.evidence.providerMonthlyMinor!==p.providerCostMinor)throw new TenantAccessError(409,'The number is already bound to a different rental agreement. Reconcile it before any further charge.');
      return { agreementId: existing.id };
    }
    const activatedAt = p.activatedAt && Number.isFinite(Date.parse(p.activatedAt)) ? new Date(p.activatedAt) : new Date();
    return rpc('billing_set_agreement', { p_org: p.organizationId, p_key: key, p_kind: 'phone_rental', p_amount: p.monthlyRetailMinor, p_resource: p.numberId, p_actor: 'usr_super_admin', p_evidence: { startsAt: nextMonth(activatedAt).toISOString(), providerMonthlyMinor: p.providerCostMinor, source: 'confirmed number activation', activationChargeReservation: p.reservationId, renewal: 'full month on the first UTC; release stops future renewals', activationDateSource: p.activatedAt ? 'provider' : 'first confirmed observation' } });
  }
  static async releaseRental(p: { organizationId: string; numberId: string; providerReference: string; evidence: Row }) {
    const existing = await checked(saasDatabase().from('billing_recurring_agreements').select('id').eq('organization_id', p.organizationId).eq('agreement_key', `number:${p.numberId}`).maybeSingle());
    if (!existing) return { stopped: false, reason: 'no_customer_rental_agreement' };
    return rpc('billing_stop_agreement', { p_org: p.organizationId, p_key: `number:${p.numberId}`, p_actor: 'usr_super_admin', p_evidence: { numberId: p.numberId, providerReference: p.providerReference, released: true } });
  }
  static async credit(p: { organizationId: string; actorId: string; amountMinor: number; paymentReference: string; confirmed: boolean; evidence: Row }) {
    money(p.amountMinor); text(p.paymentReference, 'Confirmed payment reference');
    if (p.actorId !== 'usr_super_admin' || p.confirmed !== true || !p.evidence?.note?.trim()) throw new TenantAccessError(403, 'An administrator must verify receipt of payment and record evidence.');
    return rpc('billing_credit_wallet', { p_org: p.organizationId, p_amount: p.amountMinor, p_external_reference: p.paymentReference.trim(), p_actor: p.actorId, p_evidence: { note: p.evidence.note.trim(), confirmed: true } });
  }
  static async refund(p: { organizationId: string; actorId: string; reservationId: string; amountMinor: number; reference: string; confirmed: boolean; reason: string }) {
    money(p.amountMinor); text(p.reference, 'Refund reference'); text(p.reason, 'Refund reason');
    if (p.actorId !== 'usr_super_admin' || p.confirmed !== true) throw new TenantAccessError(403, 'Administrator confirmation is required.');
    return rpc('billing_refund_wallet', { p_org: p.organizationId, p_reservation: p.reservationId, p_amount: p.amountMinor, p_external_reference: p.reference.trim(), p_actor: p.actorId, p_evidence: { reason: p.reason.trim(), destination: 'customer_wallet' } });
  }
}
