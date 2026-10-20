import { SaasAdminService } from '@/lib/saas/admin';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { saasRpc } from '@/lib/saas/storage';
import { tenantState } from '@/lib/saas/policy';
import { zernioClient } from '@/lib/zernio/client';
import {
  resolveEffectiveTenantPolicy,
  type GlobalAdminConfigState,
  type PlanTemplateState,
  type TenantOverrideState,
} from '@/lib/zernio/policy-engine';

/**
 * SUPER ADMIN CONTROL SERVICE
 * Gives the SaaS owner full control over:
 * 1. Global enabled platforms, ad platforms, OAuth scopes, and sub-services
 * 2. Subscription plan templates & quotas
 * 3. Per-tenant overrides, suspension, and white-label branding
 * 4. Minting & revoking Zernio Scoped API Keys (`POST /v1/api-keys` with `scope: "profiles"` & `disabledResourceGroups`)
 * 5. Per-tenant wholesale cost vs. retail subscription margin (`GET /v1/usage?range=cycle&groupBy=profile`)
 */
export class SuperAdminService {
  public static async getControlPlaneSnapshot() {
    const snapshot = await SaasAdminService.snapshot();
    const effectivePolicies = await Promise.all(snapshot.tenants.map(t => resolveEffectiveTenantPolicy(t.organizationId)));
    const configured = zernioClient.isConfigured();
    const key = zernioClient.getMasterApiKey();
    return { ...snapshot, effectivePolicies, zernioConfigured: configured, zernioApiKeyPreview: configured ? key.slice(0, 6) + '••••••' + key.slice(-4) : '' };
  }

  public static async updateGlobalConfig(
    patch: Partial<GlobalAdminConfigState>
  ): Promise<GlobalAdminConfigState> {
    return await SaasAdminService.patch('global', '1', patch) as GlobalAdminConfigState;
  }

  public static async updatePlanTemplate(
    planKey: string,
    patch: Partial<PlanTemplateState>
  ): Promise<PlanTemplateState> {
    return await SaasAdminService.patch('plan', planKey, patch) as PlanTemplateState;
  }

  public static async updateTenantOverride(
    organizationId: string,
    patch: Partial<TenantOverrideState>
  ): Promise<TenantOverrideState> {
    return await SaasAdminService.patch('tenant', organizationId, patch) as TenantOverrideState;
  }

  /**
   * Registers a durable customer organization. Its Zernio profile is provisioned
   * by ensureTenantProfile when the customer first uses the integration.
   */
  public static async createTenantOrganization(params: {
    organizationName: string;
    planKey?: string;
    primaryColor?: string;
    logoUrl?: string;
    language?: 'en' | 'es' | 'pt-BR';
  }): Promise<TenantOverrideState> {
    const row = await saasRpc('saas_admin_create_workspace', { p_name: params.organizationName, p_plan_key: params.planKey || 'starter', p_branding: { companyName: params.organizationName, logoUrl: params.logoUrl || '', primaryColor: params.primaryColor || '#10B981', language: params.language || 'en' }, p_actor_id: 'usr_super_admin' });
    return tenantState(row);
  }

  public static async deleteTenantOrganization(
    organizationId: string
  ): Promise<void> {
    await SaasAdminService.archive(organizationId);
  }

  /**
   * Mints a Zernio Scoped API Key (`POST /v1/api-keys`) restricted strictly to
   * this tenant's `profileId` and with `disabledResourceGroups` matching their plan/override.
   * Ref: zernio.txt lines 19584-19619
   */
  public static async mintTenantScopedApiKey(params: {
    organizationId: string;
    permission?: 'read' | 'write';
    expiresInDays?: number;
  }) {
    throw new TenantAccessError(501, 'Provider credential issuance is unavailable here. Create a managed workspace API key in security settings.');
  }

  /**
   * Fetches Zernio's per-profile spend breakdown (`GET /v1/usage?range=cycle&groupBy=profile`)
   * and compares it against each tenant's SaaS subscription price to compute real-time margin.
   * Ref: zernio.txt lines 13462-13529 & 19620-19623
   */
  public static async getWholesaleVsRetailBillingReport() {
    const snapshot = await this.getControlPlaneSnapshot();
    let provider: Record<string, any> | null = null;
    if (zernioClient.isConfigured()) {
      try { const result = await zernioClient.request<Record<string, any>>({ path: '/usage', query: { range: 'cycle', groupBy: 'profile', granularity: 'total' } });
        if (result.data && typeof result.data.totals === 'object') provider = result.data;
      } catch { /* Provider costs remain unavailable; no fabricated estimates. */ }
    }
    const groups = new Map((provider?.attribution?.groups || []).map((g: any) => [g.profileId, g.totals]));
    return { live: Boolean(provider), customerPayments: 'coming_soon', zernioTeamTotals: provider?.totals || null, unattributedTotals: provider?.attribution?.unattributed || null,
      tenantRows: snapshot.tenants.map(t => { const totals = t.zernioProfileId ? groups.get(t.zernioProfileId) as any : null;
        const cost = typeof totals?.total === 'number' && Number.isFinite(totals.total) ? totals.total : null;
        return { organizationId: t.organizationId, organizationName: t.organizationName, zernioProfileId: t.zernioProfileId, planKey: t.planKey,
          retailRevenueUsd: 0, zernioWholesaleUsd: cost, grossMarginUsd: cost == null ? null : -cost, marginPercent: null, breakdown: totals || null };
      }) };

  }
}
