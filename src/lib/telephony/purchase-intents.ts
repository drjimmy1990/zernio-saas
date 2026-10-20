import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioApiException } from '@/lib/zernio/client';

export interface PurchaseIntent {
  state: 'pending' | 'kyc_required' | 'purchased' | 'terminal';
  attempted: boolean;
  number_id: string | null;
  kyc_url: string | null;
  terminal_code: string | null;
}

function storageUnavailable(): ZernioApiException {
  return new ZernioApiException({ status: 503, code: 'PURCHASE_STORAGE_UNAVAILABLE', error: 'Purchase persistence is unavailable. Retry with the same purchase intent.' });
}

export class PurchaseIntentStore {
  private static client() {
    // Financial mutations require service-role storage; never use the anon fallback.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw storageUnavailable();
    const client = createSupabaseAdminClient();
    if (!client) throw storageUnavailable();
    return client;
  }

  public static async acquire(params: { organizationId: string; profileId: string; intentId: string; fingerprint: string; lockToken: string }): Promise<PurchaseIntent> {
    const { data, error } = await Promise.resolve(this.client().rpc('acquire_phone_purchase_intent', {
      p_organization_id: params.organizationId, p_profile_id: params.profileId,
      p_intent_id: params.intentId, p_fingerprint: params.fingerprint, p_lock_token: params.lockToken,
    })).catch(() => { throw storageUnavailable(); });
    if (error || !data) throw storageUnavailable();
    if (data.error_code) {
      throw new ZernioApiException({ status: data.error_code === 'PURCHASE_IN_PROGRESS' ? 503 : 409,
        code: data.error_code, error: data.message || 'This purchase intent cannot be used. Retry the original intent.' });
    }
    if (!['pending', 'kyc_required', 'purchased', 'terminal'].includes(data.state) || typeof data.attempted !== 'boolean') throw storageUnavailable();
    return data as PurchaseIntent;
  }

  public static async update(params: { organizationId: string; intentId: string; lockToken: string; state: PurchaseIntent['state']; attempted: boolean; numberId?: string; kycUrl?: string; terminalCode?: string; release?: boolean }): Promise<void> {
    const { data, error } = await Promise.resolve(this.client().rpc('update_phone_purchase_intent', {
      p_organization_id: params.organizationId, p_intent_id: params.intentId, p_lock_token: params.lockToken,
      p_state: params.state, p_attempted: params.attempted, p_number_id: params.numberId ?? null,
      p_kyc_url: params.kycUrl ?? null, p_terminal_code: params.terminalCode ?? null, p_release: params.release ?? false,
    })).catch(() => { throw storageUnavailable(); });
    if (error || data !== true) throw storageUnavailable();
  }
}
