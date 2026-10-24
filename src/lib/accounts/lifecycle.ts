import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';

/** Verify ownership before DELETE; never hide a failed or ambiguous provider mutation. */
export async function disconnectAccount(organizationId: string, accountId: string) {
  await requireTenantAccounts(organizationId, [accountId]);
  const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  let alreadyDisconnected = false;
  try {
    await zernioClient.request({ method: 'DELETE', path: `/accounts/${encodeURIComponent(accountId)}` });
  } catch {
    alreadyDisconnected = true;
  }
  // Even a 2xx acknowledgment is insufficient: confirm the remote account is absent.
  try {
    const { data } = await zernioClient.request<{ accounts?: Array<{ _id: string; profileId: string | { _id?: string } }> }>({
      method: 'GET', path: '/accounts', query: { profileId },
    });
    if (!Array.isArray(data.accounts) || data.accounts.some((account) => account._id === accountId)) {
      throw new Error('Disconnection not confirmed');
    }
  } catch {
    throw new ZernioApiException({ status: 503, error: 'The provider has not confirmed disconnection. Refresh account health before retrying.', code: 'disconnect_unconfirmed' });
  }
  try { WorkspaceStore.removeConnectedAccount(organizationId, accountId); }
  catch { throw new TenantAccessError(503, 'The provider disconnected the account, but the dashboard could not refresh. Refresh your workspace.'); }
  return { success: true, simulated: false, accountId, alreadyDisconnected };
}

export async function verifyReconnectIdentity(organizationId: string, accountId: string, platform: string) {
  const [account] = await requireTenantAccounts(organizationId, [accountId]);
  if (account.platform !== platform) throw new TenantAccessError(400, 'Reconnect the account using its original platform.');
  const canonical = account as typeof account & { platformUserId?: string; metadata?: { instagramScopedId?: string; loginMethod?: string } };
  // TikTok open_id is per TikTok app, so it changes when a reconnect moves the account to the
  // Business app lane; Zernio matches TikTok accounts by @handle instead (zernio.txt "Connection lanes").
  const platformUserId = platform === 'instagram' ? canonical.metadata?.instagramScopedId || canonical.platformUserId : platform === 'tiktok' ? undefined : canonical.platformUserId;
  if (['facebook', 'instagram'].includes(platform) && !platformUserId) {
    throw new TenantAccessError(409, platform === 'facebook' ? 'The provider did not return the Facebook Page identity. Refresh accounts before reconnecting.' : 'The provider did not return the Instagram professional account identity. Refresh accounts before reconnecting.');
  }
  if (platform === 'tiktok' && !account.username?.trim()) {
    throw new TenantAccessError(409, 'The provider did not return the TikTok @handle. Refresh accounts before reconnecting.');
  }
  return { reconnectAccountId: account._id, expectedPlatformUserId: platformUserId,
    ...(platform === 'instagram' ? { loginMethod: canonical.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' as const : 'instagram_login' as const } : {}) };
}
