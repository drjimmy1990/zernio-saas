import { CoreConnectService } from '@/lib/services/core-connect.service';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
import { TenantAccessError } from '@/lib/auth/tenant-access';

export interface TenantProviderAccount {
  _id: string;
  profileId: string | { _id?: string };
  platform: string;
  username?: string;
  displayName?: string;
  isActive: boolean;
  needsReconnection?: boolean;
}

/** Resolve IDs through the tenant's verified provider profile, never a browser claim. */
export async function requireTenantAccounts(organizationId: string, accountIds: unknown[]) {
  if (!accountIds.length || accountIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new TenantAccessError(400, 'Select a connected account.');
  }
  const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  const { data } = await zernioClient.request<{ accounts?: TenantProviderAccount[] }>({
    method: 'GET', path: '/accounts', query: { profileId },
  });
  if (!Array.isArray(data.accounts)) {
    throw new ZernioApiException({ status: 502, error: 'Zernio did not return an account list.' });
  }
  return accountIds.map((id) => {
    const account = data.accounts!.find((item) => item._id === id &&
      (typeof item.profileId === 'string' ? item.profileId : item.profileId?._id) === profileId);
    if (!account) throw new TenantAccessError(403, 'This account is not connected to your workspace.');
    return account;
  });
}
