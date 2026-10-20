import { WhatsAppBroadcastService } from '@/lib/whatsapp/broadcasts';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
import type { Campaign } from './store';

const params = (campaign: Campaign) => ({ organizationId: campaign.organization_id, accountId: campaign.account_id, broadcastId: campaign.provider_id! });
export async function campaignProviderRead(campaign: Campaign) {
  if (!campaign.provider_id) return null;
  return (await WhatsAppBroadcastService.get(params(campaign))).broadcast as Record<string, unknown>;
}
export async function campaignRecipients(campaign: Campaign, skip = 0, status?: string): Promise<Record<string, unknown> & { recipients: Record<string, unknown>[] }> {
  if (!campaign.provider_id) return { recipients: [], pagination: { hasMore: false, total: 0 }, summary: null };
  await campaignProviderRead(campaign);
  if (!Number.isInteger(skip) || skip < 0 || (status && !['pending', 'sent', 'delivered', 'read', 'failed'].includes(status))) throw new ZernioApiException({ status: 400, error: 'Invalid recipient filter.' });
  const { data } = await zernioClient.request({ path: `/broadcasts/${encodeURIComponent(campaign.provider_id)}/recipients`, query: { skip, limit: 100, status } });
  if (!Array.isArray(data.recipients) || !data.pagination || data.success === false || data.error) throw new ZernioApiException({ status: 502, error: 'Recipient results are unavailable.' });
  return data as Record<string, unknown> & { recipients: Record<string, unknown>[] };
}
export async function verifyProviderRecipients(campaign: Campaign) {
  const phones: string[] = []; let skip = 0;
  for (let page = 0; page < 11; page++) {
    const result = await campaignRecipients(campaign, skip);
    const recipients = result.recipients as { platformIdentifier?: string }[];
    if (recipients.some(item => typeof item.platformIdentifier !== 'string' || !/^\+?[1-9]\d{6,14}$/.test(item.platformIdentifier))) throw new ZernioApiException({ status: 502, error: 'Provider recipient identities could not be verified.' });
    phones.push(...recipients.map(item => item.platformIdentifier!.replace(/^\+/, '')));
    const pagination = result.pagination as { hasMore?: boolean; total?: number };
    if (typeof pagination.hasMore !== 'boolean') throw new ZernioApiException({ status: 502, error: 'Provider recipient pagination is unavailable.' });
    if (!pagination.hasMore) {
      const expected = campaign.audience_snapshot.phones.map(phone => phone.replace(/^\+/, '')).sort();
      if (JSON.stringify(phones.sort()) !== JSON.stringify(expected)) throw new ZernioApiException({ status: 409, error: 'Provider recipients differ from the reviewed audience. Sending was stopped.' });
      return;
    }
    if (!recipients.length) break;
    skip += recipients.length;
  }
  throw new ZernioApiException({ status: 502, error: 'The full recipient list could not be verified.' });
}
export async function cancelProviderCampaign(campaign: Campaign) {
  const current = await campaignProviderRead(campaign);
  if (current?.status === 'draft') {
    await zernioClient.request({ method: 'DELETE', path: `/broadcasts/${encodeURIComponent(campaign.provider_id!)}`, retryOnRateLimit: false });
    try { await campaignProviderRead(campaign); }
    catch (error) {
      if (error instanceof ZernioApiException && error.envelope.status === 404) return { id: campaign.provider_id, status: 'cancelled', providerDraftDeleted: true };
      throw error;
    }
    throw new ZernioApiException({ status: 502, error: 'Provider draft removal was not confirmed. Refresh the existing campaign.' });
  }
  if (!current || !['scheduled', 'sending'].includes(String(current.status))) throw new ZernioApiException({ status: 409, error: 'Only a scheduled or sending provider campaign can be cancelled. Already-sent messages are not recalled.' });
  const { data } = await zernioClient.request({ method: 'POST', path: `/broadcasts/${encodeURIComponent(campaign.provider_id!)}/cancel`, retryOnRateLimit: false });
  const result = data.broadcast as Record<string, unknown> | undefined;
  if (data.success === false || !result || result.id !== campaign.provider_id || result.status !== 'cancelled') throw new ZernioApiException({ status: 502, error: 'Provider cancellation was not confirmed. Refresh the existing campaign.' });
  return result;
}
