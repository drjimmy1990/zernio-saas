import { TenantAccessError } from '@/lib/auth/tenant-access';
import { normalizeCrmPhone } from './audience';
import type { ContactInput, CrmField } from './types';
export const crmUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function crmText(value: unknown, label: string, max = 500, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max || /\u0000/.test(value)) throw new TenantAccessError(400, `${label} must be text${empty ? '' : ' with a value'}, up to ${max} characters.`);
  return value.trim();
}
export function validateContactInput(input: unknown, fields: CrmField[]): ContactInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TenantAccessError(400, 'Expected a contact object.');
  const value = input as Record<string, any>;
  const allowed = ['display_name','company','phones','emails','identities','tags','custom_fields','status','owner_user_id','do_not_contact'];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new TenantAccessError(400, 'Unsupported contact field. Consent and notes use their separate actions.');
  const result: ContactInput = { display_name: crmText(value.display_name, 'Contact name', 200) };
  if (value.company !== undefined) result.company = crmText(value.company, 'Company', 200, true);
  for (const field of ['phones', 'emails', 'tags'] as const) if (value[field] !== undefined) {
    if (!Array.isArray(value[field]) || value[field].length > (field === 'tags' ? 50 : 20)) throw new TenantAccessError(400, `Invalid ${field} list.`);
    const values: string[] = value[field].map((item: unknown) => field === 'phones' ? normalizeCrmPhone(crmText(item, 'Phone', 50)) : field === 'emails' ? crmText(item, 'Email', 254).toLowerCase() : crmText(item, 'Tag', 50));
    if (field === 'emails' && values.some(item => !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(item))) throw new TenantAccessError(400, 'Enter valid email addresses.');
    result[field] = [...new Set(values)];
  }
  if (value.identities !== undefined) {
    if (!Array.isArray(value.identities) || value.identities.length > 30) throw new TenantAccessError(400, 'Add at most 30 platform identities.');
    result.identities = value.identities.map((identity: any) => {
      if (!identity || typeof identity !== 'object' || Array.isArray(identity) || Object.keys(identity).some(key => !['platform','accountId','participantId','handle'].includes(key))) throw new TenantAccessError(400, 'Invalid platform identity.');
      const platform = crmText(identity.platform, 'Platform', 50).toLowerCase();
      if (!/^[a-z][a-z0-9_-]*$/.test(platform) || (!identity.handle && !identity.participantId) || (identity.participantId && !identity.accountId)) throw new TenantAccessError(400, 'A platform identity needs a handle, or participant ID with its account scope.');
      return { platform, ...(identity.accountId ? {accountId:crmText(identity.accountId,'Account ID',200)} : {}), ...(identity.participantId ? {participantId:crmText(identity.participantId,'Participant ID',200)} : {}), ...(identity.handle ? {handle:crmText(identity.handle,'Handle',200)} : {}) };
    });
  }
  if (value.status !== undefined) { if (!['lead','customer','inactive'].includes(value.status)) throw new TenantAccessError(400, 'Invalid contact status.'); result.status = value.status; }
  if (value.owner_user_id !== undefined) { if (value.owner_user_id !== null && !crmUuid(value.owner_user_id)) throw new TenantAccessError(400, 'Select a workspace member as owner.'); result.owner_user_id = value.owner_user_id; }
  if (value.do_not_contact !== undefined) { if (typeof value.do_not_contact !== 'boolean') throw new TenantAccessError(400, 'Do not contact must be boolean.'); result.do_not_contact = value.do_not_contact; }
  if (value.custom_fields !== undefined) {
    if (!value.custom_fields || typeof value.custom_fields !== 'object' || Array.isArray(value.custom_fields)) throw new TenantAccessError(400, 'Custom fields must be an object.');
    for (const [id, item] of Object.entries(value.custom_fields)) {
      const definition = fields.find(field => field.id === id);
      if (!definition) continue; // Save/import guards preserve existing legacy values and reject new unknown keys.
      if (item == null) continue;
      if (definition.kind === 'text') crmText(item, definition.name, 2000, true);
      if ((definition.kind === 'number' && (typeof item !== 'number' || !Number.isFinite(item))) || (definition.kind === 'boolean' && typeof item !== 'boolean') || (definition.kind === 'date' && (typeof item !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item) || !Number.isFinite(Date.parse(item)) || new Date(item).toISOString().slice(0,10) !== item)) || (definition.kind === 'select' && (typeof item !== 'string' || !definition.options.includes(item)))) throw new TenantAccessError(400, `Invalid value for ${definition.name}.`);
    }
    result.custom_fields = value.custom_fields;
  }
  return result;
}
