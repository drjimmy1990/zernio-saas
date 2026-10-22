import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { ZernioApiException, zernioClient, type ZernioRequestOptions } from '@/lib/zernio/client';
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

export async function purchasePhoneNumber(_params: PurchasePhoneNumberParams): Promise<PurchasePhoneNumberResult> {
  fail(501, 'RETAIL_QUOTE_REQUIRED', 'Use the Phone workspace to review a current customer price and reserve prepaid funds before buying a number.');
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
