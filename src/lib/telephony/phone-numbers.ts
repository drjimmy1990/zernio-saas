import { createHash, randomUUID } from 'crypto';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { ZernioApiException, zernioClient, type ZernioRequestOptions } from '@/lib/zernio/client';
import { PurchaseIntentStore, type PurchaseIntent } from '@/lib/telephony/purchase-intents';
import type { AvailablePhoneNumber, OwnedPhoneNumber } from '@/types/telephony';

export type PhoneNumberType = 'local' | 'mobile' | 'toll_free' | 'national';
export interface PhoneCountryType {
  numberType: PhoneNumberType;
  monthlyCents: number;
  needsKyc: boolean;
  whatsappAvailable: boolean;
  inStock: boolean;
  smsAvailable?: boolean;
  callsAvailable?: boolean;
  preOrderable?: boolean;
  fulfilment?: string;
}
export interface PhoneCountry { country: string; countryName: string; types: PhoneCountryType[] }
type ProviderNumber = Record<string, unknown>;
const numberTypes: PhoneNumberType[] = ['local', 'mobile', 'toll_free', 'national'];
const numberStatuses = ['active', 'pending', 'kyc_required', 'pending_payment', 'pending_regulatory', 'regulatory_declined', 'provisioning', 'verifying', 'suspended', 'releasing', 'released'];
const e164 = /^\+[1-9]\d{6,14}$/;

function fail(status: number, code: string, error: string, details?: Record<string, unknown>): never {
  throw new ZernioApiException({ status, code, error, details });
}

async function request<T>(options: ZernioRequestOptions) {
  if (!zernioClient.isConfigured()) fail(503, 'provider_not_configured', 'Zernio is not configured. Contact your administrator.');
  try {
    return await zernioClient.request<T>(options);
  } catch (error) {
    if (error instanceof ZernioApiException) throw error;
    fail(503, 'PROVIDER_UNAVAILABLE', 'Zernio could not be reached. Retry with the same purchase intent.');
  }
}

function profileOf(number: ProviderNumber): string | undefined {
  const profile = number.profileId;
  return typeof profile === 'string' ? profile : profile && typeof profile === 'object' ? (profile as { _id?: string })._id : undefined;
}

function countryName(code: string): string {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
}

function flag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => c.charCodeAt(0) + 127397)) : '';
}

function mapOwned(number: ProviderNumber, profileId: string): OwnedPhoneNumber {
  const id = number._id ?? number.id;
  if (typeof id !== 'string' || !id || profileOf(number) !== profileId) {
    fail(502, 'PHONE_NUMBER_OWNERSHIP_UNVERIFIED', 'Zernio did not return a valid phone number owned by this workspace.');
  }
  if (typeof number.status !== 'string' || !numberStatuses.includes(number.status)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an unknown phone number status.');
  const phoneNumber = typeof number.phoneNumber === 'string' ? number.phoneNumber : '';
  if ((phoneNumber && !e164.test(phoneNumber)) || (number.status === 'active' && !e164.test(phoneNumber))) {
    fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid phone number.');
  }
  const country = typeof number.country === 'string' ? number.country.toUpperCase() : '';
  const type = number.numberType ?? number.type;
  if (!numberTypes.includes(type as PhoneNumberType)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an unknown phone number type.');
  const features = number.features && typeof number.features === 'object' ? number.features as Record<string, unknown> : {};
  const socialAccountId = typeof number.socialAccountId === 'string' ? number.socialAccountId : undefined;
  const monthlyCents = number.monthlyCents;
  return {
    id, phoneNumber, profileId, country, countryName: countryName(country), flag: flag(country),
    type: type as PhoneNumberType, status: number.status as OwnedPhoneNumber['status'],
    monthlyPriceUsd: typeof monthlyCents === 'number' && Number.isFinite(monthlyCents) && monthlyCents >= 0 ? monthlyCents / 100 : null,
    provisionedAt: typeof number.provisionedAt === 'string' ? number.provisionedAt : '',
    voiceEnabled: features.calls === true, smsEnabled: number.smsCapable === true && number.smsSendApproved === true,
    whatsappEnabled: features.whatsapp === true, whatsappLinked: Boolean(socialAccountId), socialAccountId,
    ownerAccountId: typeof number.ownerAccountId === 'string' ? number.ownerAccountId : undefined,
    kycUrl: typeof number.verifyUrl === 'string' ? number.verifyUrl : typeof number.onfidoVerificationUrl === 'string' ? number.onfidoVerificationUrl : undefined,
  };
}

async function ownedForProfile(profileId: string): Promise<OwnedPhoneNumber[]> {
  const { data } = await request<{ numbers?: ProviderNumber[] }>({ method: 'GET', path: '/phone-numbers', query: { profileId } });
  if (!Array.isArray(data.numbers)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio did not return its phone number list.');
  return data.numbers.filter((number) => profileOf(number) === profileId).map((number) => mapOwned(number, profileId));
}

async function ownedById(profileId: string, id: string): Promise<OwnedPhoneNumber> {
  // Detail responses omit profile/type. Establish ownership from the fresh team list first.
  const owned = (await ownedForProfile(profileId)).find((number) => number.id === id);
  if (!owned) fail(404, 'PHONE_NUMBER_NOT_FOUND', 'This phone number does not belong to your workspace.');
  const { data } = await request<{ phoneNumber?: ProviderNumber }>({ method: 'GET', path: `/phone-numbers/${encodeURIComponent(id)}` });
  if (!data.phoneNumber || (data.phoneNumber._id ?? data.phoneNumber.id) !== id || (data.phoneNumber.profileId !== undefined && profileOf(data.phoneNumber) !== profileId)) {
    fail(404, 'PHONE_NUMBER_NOT_FOUND', 'This phone number does not belong to your workspace.');
  }
  const detail = data.phoneNumber;
  if (detail.phoneNumber !== undefined && detail.phoneNumber !== owned.phoneNumber) fail(502, 'PHONE_NUMBER_ALLOCATION_MISMATCH', 'Zernio returned inconsistent phone number details.');
  if (typeof detail.status !== 'string' || !numberStatuses.includes(detail.status)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an unknown phone number status.');
  const status = detail.status as OwnedPhoneNumber['status'];
  if (status === 'active' && !e164.test(owned.phoneNumber)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an active number without valid E.164 allocation.');
  return { ...owned, status, provisionedAt: typeof detail.provisionedAt === 'string' ? detail.provisionedAt : owned.provisionedAt,
    kycUrl: owned.kycUrl || (typeof detail.onfidoVerificationUrl === 'string' ? detail.onfidoVerificationUrl : undefined) };
}

function cacheOwned(organizationId: string, numbers: OwnedPhoneNumber[]): void {
  const workspace = WorkspaceStore.getWorkspace(organizationId);
  const voiceAgents = new Map(workspace.ownedNumbers.map((number) => [number.id, number.voiceAgent]));
  workspace.ownedNumbers = numbers.map((number) => {
    const voiceAgent = voiceAgents.get(number.id);
    return voiceAgent ? { ...number, voiceAgent } : number;
  });
  WorkspaceStore.saveWorkspace(organizationId, workspace);
}

export async function getPhoneCountries(): Promise<PhoneCountry[]> {
  const { data } = await request<{ countries?: Array<{ code?: string; country?: string; name?: string; types?: PhoneCountryType[] }> }>({ method: 'GET', path: '/phone-numbers/countries' });
  if (!Array.isArray(data.countries)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio did not return its country catalog.');
  return data.countries.map((entry) => {
    const code = entry.code ?? entry.country;
    if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code) || !Array.isArray(entry.types)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid country catalog.');
    for (const offer of entry.types) {
      if (!numberTypes.includes(offer.numberType) || !Number.isSafeInteger(offer.monthlyCents) || offer.monthlyCents < 0 || typeof offer.needsKyc !== 'boolean' || typeof offer.whatsappAvailable !== 'boolean' || typeof offer.inStock !== 'boolean') {
        fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid phone number offer.');
      }
    }
    return { country: code, countryName: entry.name || countryName(code), types: entry.types };
  });
}

export async function searchPhoneNumbers(params: {
  organizationId: string; country?: string; numberType?: 'all' | PhoneNumberType;
  capabilities?: { voice?: boolean; sms?: boolean; whatsapp?: boolean }; search?: string; limit?: number;
}): Promise<{ totalCountries: number; results: AvailablePhoneNumber[]; countries: PhoneCountry[] }> {
  await assertSubServiceAllowed(params.organizationId, 'telephony');
  const countries = await getPhoneCountries();
  const results: AvailablePhoneNumber[] = [];
  const limit = Math.min(Math.max(params.limit ?? 60, 1), 100);
  const query = params.search?.trim().toLowerCase();
  for (const country of countries) {
    if (params.country && params.country !== 'all' && country.country !== params.country.toUpperCase()) continue;
    for (const offer of country.types) {
      if (params.numberType && params.numberType !== 'all' && offer.numberType !== params.numberType) continue;
      if (params.capabilities?.whatsapp && !offer.whatsappAvailable) continue;
      if (params.capabilities?.voice && offer.callsAvailable === false) continue;
      if (params.capabilities?.sms && offer.smsAvailable === false) continue;
      const base = { country: country.country, countryName: country.countryName, flag: flag(country.country), type: offer.numberType,
        locality: '', monthlyPriceUsd: offer.monthlyCents / 100, monthlyCents: offer.monthlyCents, setupPriceUsd: 0,
        capabilities: { voice: offer.callsAvailable === true, sms: offer.smsAvailable === true, whatsapp: offer.whatsappAvailable },
        needsKyc: offer.needsKyc, addressConstraint: offer.needsKyc ? 'country' as const : 'none' as const };
      if (offer.needsKyc || offer.fulfilment === 'request') {
        results.push({ ...base, id: `request:${country.country}:${offer.numberType}`, phoneNumber: '', requestOnly: true });
        continue;
      }
      if (!offer.inStock) continue;
      const { data } = await request<{ country?: string; numberType?: string; numbers?: Array<{ phoneNumber?: string; features?: string[]; locality?: string }> }>({
        method: 'GET', path: '/phone-numbers/available', query: { country: country.country, numberType: offer.numberType, requireSms: params.capabilities?.sms || undefined, limit },
      });
      if (data.country !== country.country || data.numberType !== offer.numberType || !Array.isArray(data.numbers)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid inventory response.');
      for (const number of data.numbers) {
        if (typeof number.phoneNumber !== 'string' || !e164.test(number.phoneNumber) || !Array.isArray(number.features)) fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid inventory number.');
        const features = number.features;
        if (params.capabilities?.sms && !features.includes('sms')) continue;
        if (params.capabilities?.voice && !features.includes('voice')) continue;
        if (query && !`${country.country} ${country.countryName} ${number.phoneNumber} ${number.locality || ''}`.toLowerCase().includes(query)) continue;
        results.push({ ...base, id: `inventory:${country.country}:${offer.numberType}:${number.phoneNumber}`, phoneNumber: number.phoneNumber,
          locality: number.locality || '', capabilities: { voice: features.includes('voice'), sms: features.includes('sms'), whatsapp: offer.whatsappAvailable } });
      }
      if (results.length >= limit) return { totalCountries: countries.length, results: results.slice(0, limit), countries };
    }
  }
  return { totalCountries: countries.length, results: results.slice(0, limit), countries };
}

export interface PurchasePhoneNumberParams {
  organizationId: string; country: string; numberType?: PhoneNumberType; phoneNumber?: string; locality?: string;
  areaCode?: string; wantsSms?: boolean; purchaseIntentId: string; expectedMonthlyCents?: number;
}
export interface PurchasePhoneNumberResult {
  success: boolean; status: string; httpStatus: number; phoneNumber?: OwnedPhoneNumber;
  purchaseIntentId: string; kycUrl?: string; message: string;
}

export async function purchasePhoneNumber(params: PurchasePhoneNumberParams): Promise<PurchasePhoneNumberResult> {
  const policy = await assertSubServiceAllowed(params.organizationId, 'telephony');
  const country = params.country?.trim().toUpperCase();
  const numberType = params.numberType || 'local';
  const phoneNumber = params.phoneNumber?.trim() || undefined;
  const areaCode = params.areaCode?.trim() || undefined;
  if (!/^[A-Z]{2}$/.test(country) || !numberTypes.includes(numberType) || !/^[A-Za-z0-9_-]{8,128}$/.test(params.purchaseIntentId || '') || (phoneNumber && !e164.test(phoneNumber)) || (areaCode && !/^\d{1,4}$/.test(areaCode)) || (params.expectedMonthlyCents !== undefined && (!Number.isSafeInteger(params.expectedMonthlyCents) || params.expectedMonthlyCents < 0))) {
    fail(400, 'INVALID_PURCHASE_REQUEST', 'A valid country, type, E.164 number, and stable purchase intent are required.');
  }
  const profileId = await CoreConnectService.ensureTenantProfile(params.organizationId);
  const intentId = `${params.organizationId}:${params.purchaseIntentId}`;
  const fingerprint = createHash('sha256').update(JSON.stringify({ country, numberType, phoneNumber: phoneNumber || null, areaCode: areaCode || null, wantsSms: params.wantsSms === true, expectedMonthlyCents: params.expectedMonthlyCents ?? null, connectWhatsapp: true })).digest('hex');
  const lockToken = randomUUID();
  const intent = await PurchaseIntentStore.acquire({ organizationId: params.organizationId, profileId, intentId, fingerprint, lockToken });
  let state: PurchaseIntent['state'] = intent.state;
  let attempted = intent.attempted;
  let numberId = intent.number_id || undefined;
  let kycUrl = intent.kyc_url || undefined;
  let terminalCode = intent.terminal_code || undefined;
  const save = (release = false) => PurchaseIntentStore.update({ organizationId: params.organizationId, intentId, lockToken, state, attempted, numberId, kycUrl, terminalCode, release });
  try {
    if (state === 'terminal') fail(409, terminalCode || 'PURCHASE_TERMINAL', 'This purchase intent ended. Create a new intent after selecting the current offer.');
    if (numberId) {
      const verified = await ownedById(profileId, numberId);
      if (verified.country !== country || verified.type !== numberType || (phoneNumber && verified.phoneNumber !== phoneNumber)) fail(502, 'PHONE_NUMBER_ALLOCATION_MISMATCH', 'Zernio returned a phone number outside this purchase intent.');
      cacheOwned(params.organizationId, await ownedForProfile(profileId));
      return { success: true, status: 'already_purchased', httpStatus: 200, phoneNumber: verified, purchaseIntentId: params.purchaseIntentId, message: 'This purchase was already completed.' };
    }
    const current = await ownedForProfile(profileId);
    if (state === 'kyc_required') {
      // KYC can allocate asynchronously. A sole matching, profile-verified number confirms completion.
      const matched = current.filter((n) => n.country === country && n.type === numberType && n.status !== 'released');
      if (matched.length === 1 && current.filter((n) => n.status !== 'released').length === 1) {
        numberId = matched[0].id; state = 'purchased'; await save(); cacheOwned(params.organizationId, current);
        return { success: true, status: matched[0].status, httpStatus: 200, phoneNumber: matched[0], purchaseIntentId: params.purchaseIntentId, message: 'Your ordered number is now allocated.' };
      }
      return { success: false, status: 'kyc_required', httpStatus: 202, purchaseIntentId: params.purchaseIntentId, kycUrl, message: 'Complete regulatory verification to provision your number.' };
    }
    if (attempted && current.some((n) => n.status !== 'released')) {
      fail(409, 'PURCHASE_RECONCILIATION_REQUIRED', 'A phone number now exists on this profile. Contact your administrator to reconcile the original intent before retrying.');
    }
    if (attempted && params.expectedMonthlyCents !== undefined) {
      const offer = (await getPhoneCountries()).find((c) => c.country === country)?.types.find((t) => t.numberType === numberType);
      if (!offer || offer.monthlyCents !== params.expectedMonthlyCents) {
        // An unknown first attempt may already be charged; preserve its reservation while reconciling.
        fail(409, 'PURCHASE_RECONCILIATION_REQUIRED', 'The offer changed while the first purchase outcome is unknown. Contact your administrator to reconcile this intent.', { purchaseIntentId: params.purchaseIntentId, monthlyCents: offer?.monthlyCents });
      }
    }
    if (!attempted) {
      if (current.some((n) => n.status !== 'released')) fail(409, 'PROFILE_PHONE_NUMBER_LIMIT', 'This workspace profile already holds a phone number.');
      if (current.length >= policy.quotas.maxPhoneNumbers) fail(409, 'PHONE_NUMBER_QUOTA_EXCEEDED', 'The workspace phone number quota has been reached.');
      const offer = (await getPhoneCountries()).find((c) => c.country === country)?.types.find((t) => t.numberType === numberType);
      if (!offer) fail(400, 'COUNTRY_NOT_AVAILABLE', 'This country and number type are not currently offered.');
      if (!offer.whatsappAvailable) fail(400, 'WHATSAPP_NOT_AVAILABLE', 'This offer cannot connect WhatsApp.');
      if (offer.needsKyc && phoneNumber) fail(400, 'EXACT_NUMBER_REQUIRES_INSTANT_PROVISIONING', 'Regulated offers must be ordered without an exact phone number.');
      if (params.wantsSms && offer.smsAvailable === false) fail(400, 'SMS_NOT_AVAILABLE', 'This offer cannot provide SMS.');
      if (params.expectedMonthlyCents !== undefined && params.expectedMonthlyCents !== offer.monthlyCents) {
        state = 'terminal'; terminalCode = 'PRICE_CHANGED'; await save();
        fail(409, 'PRICE_CHANGED', 'The monthly price changed. Review the current offer before buying.', { monthlyCents: offer.monthlyCents, purchaseIntentId: params.purchaseIntentId });
      }
      // Persist before sending the financial mutation. Transport ambiguity retains this intent.
      attempted = true; await save();
    }
    const response = await request<{ status?: string; numberId?: string; profileId?: string; phoneNumber?: ProviderNumber | string; kycUrl?: string; message?: string }>({
      method: 'POST', path: '/phone-numbers/purchase', idempotencyKey: intentId,
      body: { profileId, country, numberType, ...(phoneNumber ? { phoneNumber } : {}), ...(areaCode ? { areaCode } : {}), connectWhatsapp: true, wantsSms: params.wantsSms === true, purchaseIntentId: intentId },
    });
    if (response.status === 202 && response.data.status === 'kyc_required') {
      if (typeof response.data.kycUrl !== 'string') fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio did not return the regulatory verification link.');
      const url = new URL(response.data.kycUrl);
      if (url.protocol !== 'https:') fail(502, 'INVALID_PROVIDER_RESPONSE', 'Zernio returned an invalid regulatory link.');
      state = 'kyc_required'; kycUrl = url.toString(); await save();
      return { success: false, status: 'kyc_required', httpStatus: 202, purchaseIntentId: params.purchaseIntentId, kycUrl, message: 'Complete regulatory verification to provision your number.' };
    }
    const data = response.data;
    const allocated = typeof data.phoneNumber === 'object' && data.phoneNumber ? data.phoneNumber : undefined;
    const allocatedId = data.status === 'already_purchased' ? data.numberId : allocated?.id ?? allocated?._id;
    const allocatedProfile = data.status === 'already_purchased' ? data.profileId : allocated && profileOf(allocated);
    if (response.status !== 200 || typeof allocatedId !== 'string' || !allocatedId || allocatedProfile !== profileId) fail(502, 'PHONE_NUMBER_OWNERSHIP_UNVERIFIED', 'Zernio did not confirm allocation to this workspace. Retry this intent or contact your administrator.');
    const verified = await ownedById(profileId, allocatedId);
    const responsePhone = typeof data.phoneNumber === 'string' ? data.phoneNumber : allocated?.phoneNumber;
    if (responsePhone !== verified.phoneNumber || (phoneNumber && phoneNumber !== verified.phoneNumber) || verified.country !== country || verified.type !== numberType) fail(502, 'PHONE_NUMBER_ALLOCATION_MISMATCH', 'Zernio returned a different phone number or offer than the confirmed allocation.');
    numberId = verified.id; state = 'purchased'; await save();
    cacheOwned(params.organizationId, await ownedForProfile(profileId));
    return { success: true, status: data.status === 'already_purchased' ? 'already_purchased' : verified.status, httpStatus: 200, phoneNumber: verified, purchaseIntentId: params.purchaseIntentId, message: data.message || 'Phone number allocated.' };
  } catch (error) {
    // A payment refusal confirms no allocation; retry the same intent with a refreshed price check.
    if (error instanceof ZernioApiException && error.envelope.status === 402) attempted = false;
    if (!attempted && error instanceof ZernioApiException && error.envelope.status === 400) { state = 'terminal'; terminalCode = error.envelope.code || 'INVALID_PURCHASE_REQUEST'; }
    if (error instanceof ZernioApiException && error.envelope.status === 409 && error.envelope.code === 'PHONE_NUMBER_UNAVAILABLE') { state = 'terminal'; terminalCode = 'PHONE_NUMBER_UNAVAILABLE'; }
    throw error;
  } finally {
    await save(true);
  }
}

export async function listOwnedPhoneNumbers(organizationId: string) {
  const policy = await assertSubServiceAllowed(organizationId, 'telephony');
  const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  const numbers = await ownedForProfile(profileId);
  cacheOwned(organizationId, numbers);
  const workspace = WorkspaceStore.getWorkspace(organizationId);
  return { simulated: false, numbers, quota: { used: numbers.filter((n) => n.status !== 'released').length, max: Math.min(1, policy.quotas.maxPhoneNumbers) }, callHistory: workspace.callHistory, threads: workspace.threads };
}

export async function getOwnedPhoneNumberForWhatsApp(organizationId: string, numberId: string): Promise<OwnedPhoneNumber> {
  await assertSubServiceAllowed(organizationId, 'telephony');
  const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  const number = await ownedById(profileId, numberId);
  if (number.status !== 'active') fail(409, 'PHONE_NUMBER_NOT_ACTIVE', 'This phone number must finish provisioning before connecting WhatsApp.');
  return number;
}
