import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { zernioClient } from '@/lib/zernio/client';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import {
  getFallbackStore,
  saveFallbackStore,
  resolveEffectiveTenantPolicy,
  type GlobalAdminConfigState,
  type PlanTemplateState,
  type TenantOverrideState,
} from '@/lib/zernio/policy-engine';
import type { ZernioResourceGroup } from '@/types/platform';

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
    const store = getFallbackStore();
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const [{ data: globalRow }, { data: planRows }, { data: orgRows }] =
        await Promise.all([
          supabase.from('platform_global_config').select('*').eq('id', 1).maybeSingle(),
          supabase.from('subscription_plan_templates').select('*').order('monthly_price_usd'),
          supabase.from('organizations').select('*, org_feature_overrides(*)').order('created_at'),
        ]);

      if (globalRow) {
        store.globalConfig = {
          brandName: globalRow.brand_name,
          brandLogoUrl: globalRow.brand_logo_url || '',
          brandPrimaryColor: globalRow.brand_primary_color,
          enforceHeadlessOAuth: globalRow.enforce_headless_oauth,
          enabledPlatforms: globalRow.enabled_platforms,
          enabledAdPlatforms: globalRow.enabled_ad_platforms,
          enabledOAuthScopes: globalRow.enabled_oauth_scopes,
          enabledSubServices: globalRow.enabled_subservices,
          defaultMaxSupportCostUsd: Number(globalRow.default_max_support_cost_usd),
        };
      }

      if (planRows && planRows.length > 0) {
        for (const p of planRows) {
          store.plans[p.plan_key] = {
            planKey: p.plan_key,
            displayName: p.display_name,
            monthlyPriceUsd: Number(p.monthly_price_usd),
            enabledSubServices: p.enabled_subservices,
            allowedPlatforms: p.allowed_platforms,
            allowedAdPlatforms: p.allowed_ad_platforms,
            allowedOAuthScopes: p.allowed_oauth_scopes,
            disabledZernioResourceGroups: p.disabled_zernio_resource_groups || [],
            maxConnectedAccounts: p.max_connected_accounts,
            maxMonthlyPosts: p.max_monthly_posts,
            maxMonthlyMessages: p.max_monthly_messages,
            maxManagedAds: p.max_managed_ads,
            maxPhoneNumbers: p.max_phone_numbers,
            maxAiSupportUsd: Number(p.max_ai_support_usd),
            maxXApiSpendUsd: Number(p.max_x_api_spend_usd),
          };
        }
      }

      if (orgRows && orgRows.length > 0) {
        for (const o of orgRows) {
          const ov = Array.isArray(o.org_feature_overrides)
            ? o.org_feature_overrides[0]
            : o.org_feature_overrides;
          store.tenants[o.id] = {
            organizationId: o.id,
            organizationName: o.name,
            slug: o.slug,
            zernioProfileId: o.zernio_profile_id,
            zernioScopedKeyId: o.zernio_scoped_key_id,
            zernioScopedKeyPrefix: o.zernio_scoped_key_prefix,
            planKey: o.plan_key,
            status: o.status,
            forceHeadlessMode: ov?.force_headless_mode ?? true,
            customEnabledSubServices: ov?.custom_enabled_subservices,
            customAllowedPlatforms: ov?.custom_allowed_platforms,
            customAllowedAdPlatforms: ov?.custom_allowed_ad_platforms,
            customAllowedOAuthScopes: ov?.custom_allowed_oauth_scopes,
            customDisabledResourceGroups: ov?.custom_disabled_resource_groups,
            customMaxConnectedAccounts: ov?.custom_max_connected_accounts,
            customMaxMonthlyPosts: ov?.custom_max_monthly_posts,
            customMaxMonthlyMessages: ov?.custom_max_monthly_messages,
            customMaxManagedAds: ov?.custom_max_managed_ads,
            customMaxPhoneNumbers: ov?.custom_max_phone_numbers,
            customMaxAiSupportUsd: ov?.custom_max_ai_support_usd
              ? Number(ov.custom_max_ai_support_usd)
              : null,
            customMaxXApiSpendUsd: ov?.custom_max_x_api_spend_usd
              ? Number(ov.custom_max_x_api_spend_usd)
              : null,
            whiteLabelBranding: o.white_label_config || {
              companyName: o.name,
              logoUrl: '',
              primaryColor: '#4F46E5',
              language: 'en',
            },
          };
        }
      }
    }

    const effectivePolicies = await Promise.all(
      Object.keys(store.tenants).map((orgId) =>
        resolveEffectiveTenantPolicy(orgId)
      )
    );

    return {
      globalConfig: store.globalConfig,
      plans: Object.values(store.plans),
      tenants: Object.values(store.tenants),
      effectivePolicies,
    };
  }

  public static async updateGlobalConfig(
    patch: Partial<GlobalAdminConfigState>
  ): Promise<GlobalAdminConfigState> {
    const store = getFallbackStore();
    store.globalConfig = {
      ...store.globalConfig,
      ...patch,
    };
    saveFallbackStore();

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase
        .from('platform_global_config')
        .update({
          brand_name: store.globalConfig.brandName,
          brand_logo_url: store.globalConfig.brandLogoUrl,
          brand_primary_color: store.globalConfig.brandPrimaryColor,
          enforce_headless_oauth: store.globalConfig.enforceHeadlessOAuth,
          enabled_platforms: store.globalConfig.enabledPlatforms,
          enabled_ad_platforms: store.globalConfig.enabledAdPlatforms,
          enabled_oauth_scopes: store.globalConfig.enabledOAuthScopes,
          enabled_subservices: store.globalConfig.enabledSubServices,
          default_max_support_cost_usd:
            store.globalConfig.defaultMaxSupportCostUsd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }

    return store.globalConfig;
  }

  public static async updatePlanTemplate(
    planKey: string,
    patch: Partial<PlanTemplateState>
  ): Promise<PlanTemplateState> {
    const store = getFallbackStore();
    const existing = store.plans[planKey];
    if (!existing) {
      throw new Error(`Unknown plan template: ${planKey}`);
    }

    const updated: PlanTemplateState = {
      ...existing,
      ...patch,
    };
    store.plans[planKey] = updated;
    saveFallbackStore();

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase
        .from('subscription_plan_templates')
        .update({
          display_name: updated.displayName,
          monthly_price_usd: updated.monthlyPriceUsd,
          enabled_subservices: updated.enabledSubServices,
          allowed_platforms: updated.allowedPlatforms,
          allowed_ad_platforms: updated.allowedAdPlatforms,
          allowed_oauth_scopes: updated.allowedOAuthScopes,
          disabled_zernio_resource_groups: updated.disabledZernioResourceGroups,
          max_connected_accounts: updated.maxConnectedAccounts,
          max_monthly_posts: updated.maxMonthlyPosts,
          max_monthly_messages: updated.maxMonthlyMessages,
          max_managed_ads: updated.maxManagedAds,
          max_phone_numbers: updated.maxPhoneNumbers,
          max_ai_support_usd: updated.maxAiSupportUsd,
          max_x_api_spend_usd: updated.maxXApiSpendUsd,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_key', planKey);
    }

    return updated;
  }

  public static async updateTenantOverride(
    organizationId: string,
    patch: Partial<TenantOverrideState>
  ): Promise<TenantOverrideState> {
    const store = getFallbackStore();
    const existing = store.tenants[organizationId];
    if (!existing) {
      throw new Error(`Unknown tenant organization: ${organizationId}`);
    }

    const updated: TenantOverrideState = {
      ...existing,
      ...patch,
      whiteLabelBranding: {
        ...existing.whiteLabelBranding,
        ...(patch.whiteLabelBranding || {}),
      },
    };
    store.tenants[organizationId] = updated;
    saveFallbackStore();

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase
        .from('organizations')
        .update({
          plan_key: updated.planKey,
          status: updated.status,
          white_label_config: updated.whiteLabelBranding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      await supabase.from('org_feature_overrides').upsert({
        organization_id: organizationId,
        force_headless_mode: updated.forceHeadlessMode,
        custom_enabled_subservices: updated.customEnabledSubServices ?? null,
        custom_allowed_platforms: updated.customAllowedPlatforms ?? null,
        custom_allowed_ad_platforms: updated.customAllowedAdPlatforms ?? null,
        custom_allowed_oauth_scopes: updated.customAllowedOAuthScopes ?? null,
        custom_disabled_resource_groups:
          updated.customDisabledResourceGroups ?? null,
        custom_max_connected_accounts:
          updated.customMaxConnectedAccounts ?? null,
        custom_max_monthly_posts: updated.customMaxMonthlyPosts ?? null,
        custom_max_monthly_messages: updated.customMaxMonthlyMessages ?? null,
        custom_max_managed_ads: updated.customMaxManagedAds ?? null,
        custom_max_phone_numbers: updated.customMaxPhoneNumbers ?? null,
        custom_max_ai_support_usd: updated.customMaxAiSupportUsd ?? null,
        custom_max_x_api_spend_usd: updated.customMaxXApiSpendUsd ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    return updated;
  }

  /**
   * Registers a new customer organization (from Sign Up or Super Admin) and
   * automatically provisions a 1:1 Zernio Profile (`POST /v1/profiles` with `externalId`).
   */
  public static async createTenantOrganization(params: {
    organizationName: string;
    planKey?: string;
    primaryColor?: string;
    logoUrl?: string;
    language?: 'en' | 'es' | 'pt-BR';
  }): Promise<TenantOverrideState> {
    const store = getFallbackStore();
    const slug = params.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `tenant-${Date.now().toString(36)}`;
    const organizationId = `org_${slug}_${Date.now().toString(36).slice(-4)}`;

    let zernioProfileId = `66f0${Date.now().toString(16).slice(-20).padStart(20, '0')}`;
    if (zernioClient.isConfigured()) {
      try {
        const { data } = await zernioClient.request<{
          profile?: { _id?: string; id?: string };
        }>({
          method: 'POST',
          path: '/profiles',
          body: {
            name: params.organizationName,
            externalId: organizationId,
            description: `White-label tenant ${params.organizationName} (${organizationId})`,
            color: params.primaryColor || '#10B981',
          },
        });
        zernioProfileId =
          data.profile?._id || data.profile?.id || zernioProfileId;
      } catch {
        // Fallback to deterministic profile ID if key lacks profile creation permission
      }
    }

    const newTenant: TenantOverrideState = {
      organizationId,
      organizationName: params.organizationName,
      slug,
      zernioProfileId,
      zernioScopedKeyId: null,
      zernioScopedKeyPrefix: null,
      planKey: params.planKey || 'growth',
      status: 'active',
      forceHeadlessMode: true,
      whiteLabelBranding: {
        companyName: params.organizationName,
        logoUrl: params.logoUrl || '',
        primaryColor: params.primaryColor || '#10B981',
        language: params.language || 'en',
      },
    };

    store.tenants[organizationId] = newTenant;
    saveFallbackStore();

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from('organizations').insert({
        id: organizationId,
        name: newTenant.organizationName,
        slug: newTenant.slug,
        zernio_profile_id: newTenant.zernioProfileId,
        plan_key: newTenant.planKey,
        status: 'active',
        white_label_config: newTenant.whiteLabelBranding,
      });
    }

    return newTenant;
  }

  public static async deleteTenantOrganization(
    organizationId: string
  ): Promise<void> {
    const store = getFallbackStore();
    delete store.tenants[organizationId];
    saveFallbackStore();

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase
        .from('org_feature_overrides')
        .delete()
        .eq('organization_id', organizationId);
      await supabase.from('organizations').delete().eq('id', organizationId);
    }
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
    const policy = await resolveEffectiveTenantPolicy(params.organizationId);
    if (!policy.zernioProfileId) {
      throw new Error(
        `Tenant "${policy.organizationName}" does not have a Zernio profileId yet.`
      );
    }

    const disabledGroups: ZernioResourceGroup[] =
      policy.disabledZernioResourceGroups;

    if (!zernioClient.isConfigured()) {
      const mockKey =
        disabledGroups.length > 0
          ? `zrk_${params.organizationId.slice(0, 8)}_${Date.now().toString(36)}`
          : `sk_${params.organizationId.slice(0, 8)}_${Date.now().toString(36)}`;

      await this.updateTenantOverride(params.organizationId, {
        zernioScopedKeyId: `key_${Date.now()}`,
        zernioScopedKeyPrefix: `${mockKey.slice(0, 16)}...`,
      });

      return {
        simulated: true,
        apiKey: {
          id: `key_${Date.now()}`,
          name: `${policy.organizationName}-scoped-key`,
          key: mockKey,
          scope: 'profiles',
          profileIds: [policy.zernioProfileId],
          permission: params.permission ?? 'write',
          disabledResourceGroups: disabledGroups,
        },
      };
    }

    const { data } = await zernioClient.request<{
      message: string;
      apiKey: {
        id: string;
        name: string;
        key: string;
        scope: string;
        profileIds: string[];
        permission: string;
      };
    }>({
      method: 'POST',
      path: '/api-keys',
      body: {
        name: `tenant-${params.organizationId}-${Date.now()}`,
        scope: 'profiles',
        profileIds: [policy.zernioProfileId],
        permission: params.permission ?? 'write',
        ...(disabledGroups.length > 0
          ? { disabledResourceGroups: disabledGroups }
          : {}),
        ...(params.expiresInDays ? { expiresIn: params.expiresInDays } : {}),
      },
    });

    await this.updateTenantOverride(params.organizationId, {
      zernioScopedKeyId: data.apiKey.id,
      zernioScopedKeyPrefix: `${data.apiKey.key.slice(0, 12)}...`,
    });

    return { simulated: false, apiKey: data.apiKey };
  }

  /**
   * Fetches Zernio's per-profile spend breakdown (`GET /v1/usage?range=cycle&groupBy=profile`)
   * and compares it against each tenant's SaaS subscription price to compute real-time margin.
   * Ref: zernio.txt lines 13462-13529 & 19620-19623
   */
  public static async getWholesaleVsRetailBillingReport() {
    const snapshot = await this.getControlPlaneSnapshot();
    const plansByKey = Object.fromEntries(
      snapshot.plans.map((p) => [p.planKey, p])
    );

    if (zernioClient.isConfigured()) {
      try {
        const { data } = await zernioClient.request<{
          totals: Record<string, number>;
          attribution?: {
            groups?: Array<{
              profileId: string;
              totals: Record<string, number>;
            }>;
            unattributed?: Record<string, number>;
          };
        }>({
          method: 'GET',
          path: '/usage',
          query: { range: 'cycle', groupBy: 'profile', granularity: 'total' },
        });

        const groupsByProfile = new Map(
          (data.attribution?.groups || []).map((g) => [g.profileId, g.totals])
        );

        const tenantRows = snapshot.tenants.map((t) => {
          const retailUsd = plansByKey[t.planKey]?.monthlyPriceUsd ?? 0;
          const zernioTotals = t.zernioProfileId
            ? groupsByProfile.get(t.zernioProfileId)
            : undefined;
          const wholesaleUsd = Number(zernioTotals?.total ?? 0);
          return {
            organizationId: t.organizationId,
            organizationName: t.organizationName,
            zernioProfileId: t.zernioProfileId,
            planKey: t.planKey,
            retailRevenueUsd: retailUsd,
            zernioWholesaleUsd: wholesaleUsd,
            grossMarginUsd: Number((retailUsd - wholesaleUsd).toFixed(2)),
            marginPercent:
              retailUsd > 0
                ? Number((((retailUsd - wholesaleUsd) / retailUsd) * 100).toFixed(1))
                : 0,
            breakdown: zernioTotals || { accounts: 0, messages: 0, ads: 0, numbers: 0, xApi: 0 },
          };
        });

        return {
          live: true,
          zernioTeamTotals: data.totals,
          unattributedTotals: data.attribution?.unattributed || {},
          tenantRows,
        };
      } catch {
        // Fall through to simulated breakdown if key has no billing permission
      }
    }

    // Calculate real usage from each tenant's actual workspace state
    let totalAccountsCost = 0;
    let totalMessagesCost = 0;
    let totalAdsCost = 0;
    let totalNumbersCost = 0;

    const tenantRows = snapshot.tenants.map((t) => {
      const ws = WorkspaceStore.getWorkspace(t.organizationId);
      const retailUsd = plansByKey[t.planKey]?.monthlyPriceUsd ?? 79;

      const accountsCost = Number(
        ((ws.connectedAccounts?.length || 0) * 3.0).toFixed(2)
      );
      const messagesCost = Number(
        ((ws.inboxConversations?.length || 0) * 0.05).toFixed(2)
      );
      const adsCost = Number(((ws.campaigns?.length || 0) * 1.5).toFixed(2));
      const numbersCost = Number(
        ((ws.ownedNumbers?.length || 0) * 3.0).toFixed(2)
      );
      const wholesaleUsd = Number(
        (accountsCost + messagesCost + adsCost + numbersCost).toFixed(2)
      );

      totalAccountsCost += accountsCost;
      totalMessagesCost += messagesCost;
      totalAdsCost += adsCost;
      totalNumbersCost += numbersCost;

      return {
        organizationId: t.organizationId,
        organizationName: t.organizationName,
        zernioProfileId: t.zernioProfileId,
        planKey: t.planKey,
        retailRevenueUsd: retailUsd,
        zernioWholesaleUsd: wholesaleUsd,
        grossMarginUsd: Number((retailUsd - wholesaleUsd).toFixed(2)),
        marginPercent:
          retailUsd > 0
            ? Number(
                (((retailUsd - wholesaleUsd) / retailUsd) * 100).toFixed(1)
              )
            : 0,
        breakdown: {
          accounts: accountsCost,
          messages: messagesCost,
          ads: adsCost,
          numbers: numbersCost,
          xApi: 0,
        },
      };
    });

    const grossTotal = Number(
      (
        totalAccountsCost +
        totalMessagesCost +
        totalAdsCost +
        totalNumbersCost
      ).toFixed(2)
    );

    return {
      live: false,
      zernioTeamTotals: {
        accounts: Number(totalAccountsCost.toFixed(2)),
        messages: Number(totalMessagesCost.toFixed(2)),
        ads: Number(totalAdsCost.toFixed(2)),
        numbers: Number(totalNumbersCost.toFixed(2)),
        credits: 0,
        total: grossTotal,
      },
      unattributedTotals: { credits: 0 },
      tenantRows,
    };
  }
}
