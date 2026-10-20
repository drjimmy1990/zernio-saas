import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { TenantAccessError } from '@/lib/auth/tenant-access';

export type CrmConsent = { channel: 'whatsapp' | 'sms' | 'email' | 'phone'; destination: string; purpose: 'marketing' | 'transactional' | 'call'; status: 'granted' | 'withdrawn'; source: string; recordedAt: string };
export function normalizeCrmPhone(value: string): string {
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new TenantAccessError(400, 'Use an international phone number beginning with + and a country code.');
  return phone;
}
export async function readAudienceContacts(organizationId: string, contactIds?: string[]) {
  const db = createSupabaseAdminClient();
  if (!db) throw new TenantAccessError(503, 'CRM storage is unavailable.');
  let query = db.from('contacts').select('id,phone,phones,status,archived_at,do_not_contact,consents,updated_at').eq('organization_id', organizationId);
  if (contactIds) query = query.in('id', contactIds);
  const { data, error } = await query.limit(1001);
  if (error || !Array.isArray(data)) throw new TenantAccessError(503, 'CRM eligibility could not be verified.');
  if (data.length > 1000) throw new TenantAccessError(400, 'Select at most 1,000 contacts.');
  return data;
}
export async function readDestinationContacts(organizationId: string, phones: string[]) {
  const db = createSupabaseAdminClient();
  if (!db) throw new TenantAccessError(503, 'CRM storage is unavailable.');
  const normalized = [...new Set(phones.map(normalizeCrmPhone))];
  if (!normalized.length) return [];
  const rows:Record<string,any>[]=[];
  for(let start=0;start<10000;start+=500){
    const { data, error } = await db.from('contacts').select('id,phone,phones,archived_at,do_not_contact,consents,updated_at')
      .eq('organization_id', organizationId).or(`phone.in.(${normalized.join(',')}),phones.ov.{${normalized.join(',')}},${normalized.map(phone=>`consents.cs.[{"destination":"${phone}"}]`).join(',')}`).order('id').range(start,start+499);
    if (error || !Array.isArray(data)) throw new TenantAccessError(503, 'Destination consent could not be verified.');
    rows.push(...data);if(data.length<500)return rows;
  }
  throw new TenantAccessError(503, 'Too many duplicate destinations to verify consent safely.');
}
export function currentCrmConsent(events: CrmConsent[], channel: CrmConsent['channel'], destination: string, purpose: CrmConsent['purpose']) {
  const matching = events.filter(event => event.channel === channel && event.destination === destination && event.purpose === purpose);
  if (matching.some(event => !Number.isFinite(Date.parse(event.recordedAt)) || Date.parse(event.recordedAt) > Date.now())) return { status: 'withdrawn' };
  return matching.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt) || (a.status === 'withdrawn' ? -1 : b.status === 'withdrawn' ? 1 : 0))[0];
}
/** Explicit current consent only. Local UUIDs never become provider contact IDs. */
export async function resolveCampaignAudience(organizationId: string, contactIds: string[]): Promise<{ phones: string[]; contactIds: string[]; evidence: unknown[]; excluded: { contactId: string; reason: string }[] }> {
  if (!Array.isArray(contactIds) || !contactIds.length || contactIds.length > 1000 || contactIds.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new TenantAccessError(400, 'Select 1–1,000 CRM contacts.');
  const rows = await readAudienceContacts(organizationId, [...new Set(contactIds)]);
  const allPhones = rows.flatMap(row => [...(Array.isArray(row.phones) ? row.phones : []), ...(row.phone ? [row.phone] : [])]).flatMap(raw => { try { return [normalizeCrmPhone(raw)]; } catch { return []; } });
  const suppressionRows = await readDestinationContacts(organizationId, allPhones);
  const phones = new Set<string>(), included: string[] = [], evidence: unknown[] = [], excluded: { contactId: string; reason: string }[] = [];
  for (const id of [...new Set(contactIds)].sort()) {
    const row = rows.find(contact => contact.id === id);
    if (!row) { excluded.push({ contactId: id, reason: 'Contact is unavailable in this workspace.' }); continue; }
    if (row.archived_at || row.do_not_contact) { excluded.push({ contactId: id, reason: 'Contact is archived or marked do not contact.' }); continue; }
    const destinations = [...new Set<string>([...(Array.isArray(row.phones) ? row.phones : []), ...(row.phone ? [row.phone] : [])])];
    const approved: string[] = [];
    for (const raw of destinations) {
      let phone: string; try { phone = normalizeCrmPhone(raw); } catch { continue; }
      const suppressed = suppressionRows.some(other => ([other.phone, ...(Array.isArray(other.phones) ? other.phones : [])].some(raw => { try { return typeof raw === 'string' && normalizeCrmPhone(raw) === phone; } catch { return false; } }) || (other.consents||[]).some((event:CrmConsent)=>event.destination===phone)) &&
        (other.do_not_contact || other.archived_at || currentCrmConsent(other.consents || [], 'whatsapp', phone, 'marketing')?.status === 'withdrawn'));
      if (suppressed) continue;
      const consent = currentCrmConsent(Array.isArray(row.consents) ? row.consents : [], 'whatsapp', phone, 'marketing');
      if (consent?.status === 'granted') { approved.push(phone); evidence.push({ contactId: id, phone, consent, updatedAt: row.updated_at }); }
    }
    if (!approved.length) { excluded.push({ contactId: id, reason: 'No current WhatsApp marketing consent for a saved phone.' }); continue; }
    approved.forEach(phone => phones.add(phone)); included.push(id);
  }
  return { phones: [...phones].sort(), contactIds: included, evidence, excluded };
}
