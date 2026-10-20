import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { MetaInboxService } from '@/lib/meta-inbox/service';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException, type ZernioRequestOptions } from '@/lib/zernio/client';

export type MetaSetting = 'messenger-greeting' | 'messenger-menu' | 'messenger-ice-breakers' | 'instagram-ice-breakers';
export type MetaSettingParams = { organizationId: string; accountId: string; setting: MetaSetting };
export type MetaThreadControlParams = { organizationId: string; accountId: string; conversationId: string; action: 'pass' | 'take' | 'request' | 'release'; targetAppId?: string; metadata?: string };
type Result = Record<string, any> & { httpStatus: number };
type JsonObject = Record<string, any>;
const settingFields: Record<MetaSetting, string> = { 'messenger-greeting': 'greeting', 'messenger-menu': 'persistent_menu', 'messenger-ice-breakers': 'ice_breakers', 'instagram-ice-breakers': 'ice_breakers' };
function invalid(error: string): never { throw new ZernioApiException({ status: 400, code: 'invalid_request', error }); }
function malformed(mutation = false): never {
 throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: mutation ? 'The provider did not confirm this change. Refresh the canonical settings or conversation before trying again.' : 'The provider returned incomplete messaging settings.', ...(mutation ? { details: { outcome: 'unknown', reconcileBeforeRetry: true } } : {}) });
}
function object(value: unknown, allowed?: string[]): JsonObject {
 if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Use a settings object.');
 if (allowed && Object.keys(value).some(key => !allowed.includes(key))) invalid('Unsupported settings fields.');
 return value as JsonObject;
}
function text(value: unknown, name: string, max?: number) {
 if (typeof value !== 'string' || !value.trim() || (max && [...value].length > max)) invalid(`${name} must be nonempty${max ? ` and at most ${max} characters` : ''}.`);
 return value as string;
}
function array(value: unknown, name: string, max?: number): any[] {
 if (!Array.isArray(value) || !value.length || (max && value.length > max)) invalid(`${name} must contain between 1 and ${max ?? 'the supported number of'} entries.`);
 return value as any[];
}
function locales(entries: any[]) {
 const values = entries.map(entry => {
  const locale = object(entry).locale;
  if (typeof locale !== 'string' || (locale !== 'default' && !/^[a-z]{2,3}_[A-Z]{2}$/.test(locale))) invalid('Use a Meta locale such as default, en_US or ar_AR.');
  return locale;
 });
 if (!values.includes('default') || new Set(values).size !== values.length) invalid('Include one default locale and no duplicate locales.');
}
function questions(value: unknown) {
 return array(value, 'Ice breakers', 4).map(entry => {
  const item = object(entry, ['question', 'payload']);
  return { question: text(item.question, 'Question', 80), payload: text(item.payload, 'Payload') };
 });
}
function menuItems(value: unknown, nested = false): JsonObject[] {
 return array(value, 'Menu items', nested ? 5 : 3).map(entry => {
  const item = object(entry), title = text(item.title, 'Menu title');
  if (item.type === 'postback') { object(item, ['type', 'title', 'payload']); return { type: 'postback', title, payload: text(item.payload, 'Payload') }; }
  if (item.type === 'web_url') {
   object(item, ['type', 'title', 'url', 'webview_height_ratio', 'messenger_extensions', 'fallback_url', 'webview_share_button']);
   for (const field of ['url', 'fallback_url']) if (item[field] !== undefined || field === 'url') {
    let url: URL; try { url = new URL(text(item[field], 'Menu URL')); } catch { invalid('Menu links must use HTTP or HTTPS URLs.'); }
    if (!['http:', 'https:'].includes(url!.protocol) || url!.username || url!.password) invalid('Menu links must use HTTP or HTTPS URLs without credentials.');
   }
   if (item.webview_height_ratio !== undefined && !['compact', 'tall', 'full'].includes(item.webview_height_ratio)) invalid('Invalid webview height.');
   if (item.messenger_extensions !== undefined && typeof item.messenger_extensions !== 'boolean') invalid('messenger_extensions must be a boolean.');
   if (item.webview_share_button !== undefined && item.webview_share_button !== 'hide') invalid('Invalid webview share button.');
   return { ...item, title };
  }
  if (item.type === 'nested' && !nested) { object(item, ['type', 'title', 'call_to_actions']); return { type: 'nested', title, call_to_actions: menuItems(item.call_to_actions, true) }; }
  invalid('Use postback or web_url items, or one level of nested menu items.');
 });
}
function settingBody(setting: MetaSetting, value: unknown): JsonObject {
 if (!Object.hasOwn(settingFields, setting)) invalid('Unsupported messaging setting.');
 const field = settingFields[setting];
 const body = object(value, [field]), entries = array(body[field], field);
 if (setting === 'instagram-ice-breakers') return { ice_breakers: questions(entries) };
 locales(entries);
 if (setting === 'messenger-greeting') return { greeting: entries.map(entry => { const item = object(entry, ['locale', 'text']); return { locale: item.locale, text: text(item.text, 'Greeting', 160) }; }) };
 if (setting === 'messenger-ice-breakers') return { ice_breakers: entries.map(entry => { const item = object(entry, ['locale', 'call_to_actions']); return { locale: item.locale, call_to_actions: questions(item.call_to_actions) }; }) };
 return { persistent_menu: entries.map(entry => {
  const item = object(entry, ['locale', 'composer_input_disabled', 'call_to_actions']);
  if (typeof item.composer_input_disabled !== 'boolean') invalid('composer_input_disabled must be a boolean.');
  return { locale: item.locale, composer_input_disabled: item.composer_input_disabled, call_to_actions: menuItems(item.call_to_actions) };
 }) };
}
async function owned(params: { organizationId: string; accountId: string }, setting?: MetaSetting) {
 const policy = await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
 const [account] = await requireTenantAccounts(params.organizationId, [params.accountId]);
 if (!['facebook', 'instagram'].includes(account.platform)) invalid('Select a connected Facebook or Instagram account.');
 if (!policy.allowedPlatforms.includes(account.platform as 'facebook' | 'instagram')) throw new ZernioApiException({ status: 403, code: 'platform_disabled', error: 'This platform is disabled by your plan or administrator.' });
 if (!account.isActive || account.needsReconnection) throw new ZernioApiException({ status: 409, code: 'account_reconnection_required', error: 'Reconnect this account before changing messaging settings or thread control.' });
 if (setting && account.platform !== (setting === 'instagram-ice-breakers' ? 'instagram' : 'facebook')) throw new ZernioApiException({ status: 400, code: 'platform_not_supported', error: 'This selected messaging setting is unavailable for this account platform.' });
 const metadata = (account as typeof account & { metadata?: { loginMethod?: string } }).metadata;
 return { ...account, loginMethod: metadata?.loginMethod === 'facebook_login' ? 'facebook_login' : 'instagram_login' };
}
async function provider(options: ZernioRequestOptions): Promise<Result> {
 const mutation = options.method !== undefined && options.method !== 'GET';
 try {
  const { data, status } = await zernioClient.request<JsonObject>(options);
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.error || data.success === false) malformed(mutation);
  if (mutation && data.success !== true && !(options.path.includes('/accounts/') && data.result === 'success')) malformed(true);
  return { ...data, httpStatus: status };
 } catch (error) {
  if (mutation && error instanceof ZernioApiException && error.envelope.status >= 500) throw new ZernioApiException({ ...error.envelope, details: { ...error.envelope.details, outcome: 'unknown', reconcileBeforeRetry: true } });
  throw error;
 }
}
function settingPath(params: MetaSettingParams) {
 if (!Object.hasOwn(settingFields, params.setting)) invalid('Unsupported messaging setting.');
 return `/accounts/${encodeURIComponent(params.accountId)}/${params.setting}`;
}
function readData(result: Result, setting: MetaSetting) {
 if (!Array.isArray(result.data)) malformed();
 if (result.data.length) {
  try {
   const field = settingFields[setting];
   const entries = result.data.length === 1 && Array.isArray(result.data[0]?.[field]) ? result.data[0][field] : result.data;
   if (!entries.length) return result;
   if (setting === 'instagram-ice-breakers' && entries.some((entry: any) => entry?.call_to_actions)) {
    locales(entries); entries.forEach((entry: any) => questions(entry.call_to_actions));
   } else settingBody(setting, { [field]: entries });
  } catch { malformed(); }
 }
 return result;
}

/** Exact, selected provider contracts. Membership and editor/admin gates belong to the API adapters. */
export class MetaSettingsService {
 static async getSetting(params: MetaSettingParams): Promise<Result> {
  settingPath(params); await owned(params, params.setting);
  return readData(await provider({ path: settingPath(params) }), params.setting);
 }
 static async setSetting(params: MetaSettingParams & { value: unknown }): Promise<Result> {
  const body = settingBody(params.setting, params.value); await owned(params, params.setting);
  return provider({ method: 'PUT', path: settingPath(params), body });
 }
 static async deleteSetting(params: MetaSettingParams): Promise<Result> {
  settingPath(params); await owned(params, params.setting);
  return provider({ method: 'DELETE', path: settingPath(params) });
 }
 static async threadControl(params: MetaThreadControlParams): Promise<Result> {
  if (!['pass', 'take', 'request', 'release'].includes(params.action)) invalid('Unsupported thread-control action.');
  if (params.action === 'pass') { if (typeof params.targetAppId !== 'string' || !/^[0-9]+$/.test(params.targetAppId)) invalid('Pass requires the receiving Meta app ID.'); }
  else if (params.targetAppId !== undefined) invalid('targetAppId is only supported when passing control.');
  if (params.metadata !== undefined && typeof params.metadata !== 'string') invalid('Thread-control metadata must be a string.');
  const account = await owned(params);
  if (account.platform === 'instagram' && account.loginMethod !== 'facebook_login' && ['take', 'request'].includes(params.action)) throw new ZernioApiException({ status: 400, code: 'platform_not_supported', error: 'Taking or requesting control requires an Instagram account connected through a Facebook Page.' });
  await MetaInboxService.getConversation(params);
  const result = await provider({ method: 'POST', path: `/inbox/conversations/${encodeURIComponent(params.conversationId)}/thread-control`, body: { accountId: params.accountId, action: params.action, targetAppId: params.targetAppId, metadata: params.metadata } });
  const control = result.control;
  if (control !== undefined && (!control || typeof control !== 'object' || Array.isArray(control) || (control.owner !== undefined && !['app', 'other'].includes(control.owner)) || (control.ownerAppId !== undefined && (typeof control.ownerAppId !== 'string' || !control.ownerAppId)))) malformed(true);
  let conversation: JsonObject;
  try { conversation = (await MetaInboxService.getConversation(params)).data; }
  catch (error) {
   if (error instanceof ZernioApiException) throw new ZernioApiException({ ...error.envelope, details: { ...error.envelope.details, outcome: 'unknown', reconcileBeforeRetry: true, controlRequestAccepted: true } });
   throw error;
  }
  const expectedOwner = params.action === 'take' ? 'app' : 'other';
  const confirmed = params.action !== 'request' && control?.owner === expectedOwner && control.owner === conversation.threadControl && (params.action !== 'pass' || control.ownerAppId === params.targetAppId);
  return { ...result, conversation, confirmed, pending: !confirmed };
 }
}
