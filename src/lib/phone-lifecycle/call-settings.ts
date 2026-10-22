import { account, identifier, invalid, malformed, ownedNumber, phone, profile, provider } from './provider';
import { acquire, dispatch, reserve } from './paid';
import { PhoneOperationStore } from './store';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { SaasAllowanceService } from '@/lib/saas/allowance';
import { assertDestinationConsent } from '@/lib/crm/consent';
import { CustomerBillingService } from '@/lib/billing/service';

type Input = Record<string, any>;
const nullableBoolean = (value: unknown) => typeof value === 'boolean' ? value : null;

/** Resolve the number through a tenant-owned account; never accept a caller-supplied WhatsApp number record ID. */
async function whatsappConfig(organizationId: string, accountId: string, write = false) {
  const owned = await account(organizationId, accountId, ['whatsapp'], write);
  const snapshot = await provider({ path: '/whatsapp/calling', query: { accountId } });
  if (typeof snapshot.phoneNumberDocId !== 'string' || !snapshot.phoneNumberDocId.trim()) malformed('The calling number has not been resolved. Refresh the connected account.');
  const numberId = snapshot.phoneNumberDocId;
  const config = await provider({ path: `/phone-numbers/${identifier(numberId)}/whatsapp/calling` });
  if (typeof config.callingEnabled !== 'boolean' || typeof config.phoneNumber !== 'string' || config.phoneNumber !== snapshot.phoneNumber) malformed('The provider calling configuration is inconsistent.');
  const cap = config.maxCallDurationSeconds;
  if (cap != null && (!Number.isSafeInteger(cap) || cap < 1)) malformed('The provider call duration limit is invalid.');
  return { owned, numberId, config };
}

function destination(value: unknown, current: string | null, ownNumber: string, allowEmpty: boolean) {
  if (typeof value !== 'string') invalid('Choose the phone number that should receive calls.');
  const selected = value.trim();
  if (!selected && allowEmpty) return '';
  // Existing advanced routing can be retained without exposing credentials or inventing an AI-agent setup.
  if (selected === current && /^(sip:|wss:\/\/)/.test(selected)) return selected;
  if (!selected.startsWith('tel:')) invalid('Use a phone destination in the form tel:+countrycode and number.');
  phone(selected.slice(4));
  if (selected.slice(4) === ownNumber) invalid('Forward calls to a different number to avoid a call loop.');
  return selected;
}

export class PhoneCallSettings {
  static async read(organizationId: string, input: Input): Promise<Record<string, any>> {
    if (input.channel === 'whatsapp') {
      const { numberId, config } = await whatsappConfig(organizationId, input.accountId);
      return { httpStatus: 200, settings: {
        channel: 'whatsapp', accountId: input.accountId, numberId, phoneNumber: config.phoneNumber,
        enabled: config.callingEnabled, forwardTo: typeof config.forwardTo === 'string' ? config.forwardTo : null,
        maxCallDurationSeconds: config.maxCallDurationSeconds ?? null,
        outboundDisabled: nullableBoolean(config.outboundDisabled),
        outboundSupported: false, outboundUnavailableReason: 'Provider-enforced outbound duration limits are unverified.', incomingEnableSupported: false,
        recordingEnabled: nullableBoolean(config.recordingEnabled),
        callerIdMode: ['business', 'platform'].includes(config.callerIdMode) ? config.callerIdMode : null,
        callerIdVerified: nullableBoolean(config.callerIdVerified),
      } };
    }
    if (input.channel !== 'pstn') invalid('Select a supported call channel.');
    const number = await ownedNumber(organizationId, input.numberId);
    return { httpStatus: 200, settings: {
      channel: 'pstn', numberId: number._id, phoneNumber: number.phoneNumber,
      enabled: nullableBoolean(number.pstnVoiceEnabled), forwardTo: typeof number.pstnForwardTo === 'string' ? number.pstnForwardTo : null,
      // The shared number field is documented for WhatsApp. It does not establish a PSTN hard cap.
      maxCallDurationSeconds: null, outboundSupported: false, incomingEnableSupported: false,
      recordingEnabled: nullableBoolean(number.recordingEnabled), transcriptionEnabled: nullableBoolean(number.transcriptionEnabled),
      voicemailEnabled: nullableBoolean(number.voicemailEnabled), businessHoursEnabled: nullableBoolean(number.businessHoursEnabled), ivrEnabled: nullableBoolean(number.ivrEnabled),
    } };
  }

  static async save(organizationId: string, input: Input): Promise<Record<string, any>> {
    if (typeof input.enabled !== 'boolean') invalid('Choose whether calls should be enabled.');
    if (input.enabled && input.chargesReviewed !== true) invalid('Review usage charges before enabling incoming and forwarded calls.');
    let path: string, method: 'POST' | 'PATCH' | 'DELETE', body: Input | undefined, query: Input | undefined;
    let wantedDestination: string | undefined, profileId: string;
    if (input.channel === 'whatsapp') {
      const { numberId, config, owned } = await whatsappConfig(organizationId, input.accountId, true);
      profileId = profile(owned.profileId);
      path = `/phone-numbers/${identifier(numberId)}/whatsapp/calling`;
      method = input.enabled ? (config.callingEnabled ? 'PATCH' : 'POST') : 'DELETE';
      if (input.enabled) {
        if (!Number.isSafeInteger(input.maxCallDurationSeconds) || input.maxCallDurationSeconds < 1) invalid('Set a positive whole-number duration limit in seconds.');
        wantedDestination = destination(input.forwardTo, config.forwardTo, config.phoneNumber, false);
        body = { accountId: input.accountId, forwardTo: wantedDestination, maxCallDurationSeconds: input.maxCallDurationSeconds };
      } else query = { accountId: input.accountId };
    } else if (input.channel === 'pstn') {
      const number = await ownedNumber(organizationId, input.numberId);
      profileId = number.profileId;
      if (number.status !== 'active' || number.hostedByZernio !== true || number.features?.calls !== true) throw new TenantAccessError(409, 'This number does not have active provider-hosted phone service.');
      if (number.sipTrunkId) throw new TenantAccessError(409, 'A SIP trunk controls this number. Detach it before changing call routing.');
      path = `/phone-numbers/${identifier(number._id)}/voice`;
      method = input.enabled ? 'POST' : 'DELETE';
      if (input.enabled) {
        wantedDestination = destination(input.forwardTo, number.pstnForwardTo ?? null, number.phoneNumber, true);
        body = { forwardTo: wantedDestination };
      }
    } else invalid('Select a supported call channel.');
    if (input.enabled) {
      await CustomerBillingService.assertIncomingSupported();
      const permission = await SaasAllowanceService.assertCapability({ organizationId, capability: 'voice_call' });
      if (permission.enabled !== true) throw new TenantAccessError(403, 'An administrator must enable the voice spending capability first.');
    }
    const requested = { channel: input.channel, numberId: input.channel === 'pstn' ? input.numberId : undefined, accountId: input.channel === 'whatsapp' ? input.accountId : undefined, enabled: input.enabled, forwardTo: wantedDestination, maxCallDurationSeconds: input.enabled && input.channel === 'whatsapp' ? input.maxCallDurationSeconds : undefined };
    const opened = await acquire(organizationId, profileId, 'call_settings', input.intent, requested);
    if (opened.result) return opened.result;
    // Only send reviewed fields, retaining advanced settings. Never redispatch an uncertain intent.
    return dispatch(opened.operation, () => provider({ method, path, body, query }), () => undefined, async () => {
      const result = await this.read(organizationId, input), settings = result.settings;
      if (settings.enabled !== input.enabled || (input.enabled && ((settings.forwardTo ?? '') !== wantedDestination || (input.channel === 'whatsapp' && settings.maxCallDurationSeconds !== input.maxCallDurationSeconds)))) malformed('The provider has not confirmed the requested settings. Reload the current configuration before another change.');
      return { ...result, confirmed: true };
    });
  }

  static async requestPermission(organizationId: string, input: Input): Promise<Record<string, any>> {
    if (input.consentReviewed !== true) invalid('Review the recipient and confirm the call-permission request.');
    phone(input.to);
    if (typeof input.intent !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(input.intent)) invalid('Use a stable call-permission request identifier.');
    const currentAccount = await account(organizationId, input.accountId, ['whatsapp'], true);
    // A successful prompt changes Meta's eligibility immediately; replay it before consulting those limits.
    let existing;
    try { existing = await PhoneOperationStore.get(organizationId, `call_permission:${input.intent}`); }
    catch (error) { if (!(error instanceof TenantAccessError) || error.status !== 404) throw error; }
    if (existing) {
      if (existing.profile_id !== profile(currentAccount.profileId) || existing.input.accountId !== input.accountId || existing.input.to !== input.to) throw new TenantAccessError(409, 'This request identifier belongs to a different permission request.');
      if (existing.state === 'confirmed' && existing.result) return existing.result;
      throw new TenantAccessError(409, 'This permission request already has a durable intent. Refresh permission; no second request was sent.');
    }
    const { owned, config } = await whatsappConfig(organizationId, input.accountId, true);
    if (config.callingEnabled !== true || config.outboundDisabled !== false) throw new TenantAccessError(409, 'Outbound WhatsApp calling is unavailable for this account.');
    await assertDestinationConsent({ organizationId, channel: 'whatsapp', phone: input.to, purpose: 'call' });
    const permission = await provider({ path: '/whatsapp/call-permissions', query: { accountId: input.accountId, to: input.to } });
    if (!permission.actions?.some((action: any) => action.action_name === 'send_call_permission_request' && action.can_perform_action === true)) throw new TenantAccessError(409, 'A call-permission request is not currently allowed. Check the 24-hour conversation window and provider request limits.');
    const body = { accountId: input.accountId, to: input.to, action: 'send_call_permission_request' };
    const opened = await acquire(organizationId, profile(owned.profileId), 'call_permission', input.intent, body);
    if (opened.result) return opened.result;
    await reserve(opened.operation, 'whatsapp_send', undefined, 1);
    return dispatch(opened.operation, () => provider({ method: 'POST', path: '/whatsapp/calls', body, idempotencyKey: input.intent }), () => undefined,
      async () => ({ accepted: true, permissionGranted: false, httpStatus: 200 }));
  }
}
