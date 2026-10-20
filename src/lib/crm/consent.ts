import { TenantAccessError } from '@/lib/auth/tenant-access';
import { normalizeCrmPhone, readDestinationContacts, currentCrmConsent } from './audience';

/** Manual operator approval cannot override durable CRM withdrawal or do-not-contact. */
export async function assertDestinationConsent(input: { organizationId: string; channel: 'sms' | 'whatsapp' | 'phone'; phone: string; purpose: 'transactional' | 'marketing' | 'call' }) {
  const phone = normalizeCrmPhone(input.phone);
  const rows = await readDestinationContacts(input.organizationId, [phone]);
  const contacts = rows.filter(row => [row.phone, ...(Array.isArray(row.phones) ? row.phones : [])].some(raw => { try { return typeof raw === 'string' && normalizeCrmPhone(raw) === phone; } catch { return false; } }) || (row.consents||[]).some((event:{destination:string})=>event.destination===phone));
  if (contacts.some(row => row.do_not_contact || row.archived_at)) throw new TenantAccessError(409, 'This destination is archived or marked do not contact in CRM.');
  for (const row of contacts) {
    if (currentCrmConsent(Array.isArray(row.consents) ? row.consents : [], input.channel, phone, input.purpose)?.status === 'withdrawn') throw new TenantAccessError(409, 'Consent for this destination has been withdrawn in CRM.');
  }
  return { phone, contactIds: contacts.map(row => row.id), crmChecked: true };
}
