import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  ALL_AD_PLATFORMS,
  ALL_OAUTH_SCOPES,
  ALL_SOCIAL_PLATFORMS,
  ALL_SUB_SERVICES,
  PLATFORMS_SUPPORTING_SCOPES,
  type AdPlatform,
  type EffectiveTenantPolicy,
  type OAuthScopeArea,
  type SocialPlatform,
  type SubServiceKey,
  type ZernioResourceGroup,
} from '@/types/platform';

export interface GlobalAdminConfigState {
  brandName: string;
  brandLogoUrl: string;
  brandPrimaryColor: string;
  enforceHeadlessOAuth: boolean;
  enabledPlatforms: SocialPlatform[];
  enabledAdPlatforms: AdPlatform[];
  enabledOAuthScopes: OAuthScopeArea[];
  enabledSubServices: SubServiceKey[];
  defaultMaxSupportCostUsd: number;
}

export interface PlanTemplateState {
  planKey: string;
  displayName: string;
  monthlyPriceUsd: number;
  enabledSubServices: SubServiceKey[];
  allowedPlatforms: SocialPlatform[];
  allowedAdPlatforms: AdPlatform[];
  allowedOAuthScopes: OAuthScopeArea[];
  disabledZernioResourceGroups: ZernioResourceGroup[];
  maxConnectedAccounts: number;
  maxMonthlyPosts: number;
  maxMonthlyMessages: number;
  maxManagedAds: number;
  maxPhoneNumbers: number;
  maxAiSupportUsd: number;
  maxXApiSpendUsd: number;
}

export interface TenantOverrideState {
  organizationId: string;
  organizationName: string;
  slug: string;
  zernioProfileId: string | null;
  zernioScopedKeyId: string | null;
  zernioScopedKeyPrefix: string | null;
  planKey: string;
  status: 'active' | 'suspended' | 'past_due' | 'Archived';
  forceHeadlessMode: boolean;
  customEnabledSubServices?: SubServiceKey[] | null;
  customAllowedPlatforms?: SocialPlatform[] | null;
  customAllowedAdPlatforms?: AdPlatform[] | null;
  customAllowedOAuthScopes?: OAuthScopeArea[] | null;
  customDisabledResourceGroups?: ZernioResourceGroup[] | null;
  customMaxConnectedAccounts?: number | null;
  customMaxMonthlyPosts?: number | null;
  customMaxMonthlyMessages?: number | null;
  customMaxManagedAds?: number | null;
  customMaxPhoneNumbers?: number | null;
  customMaxAiSupportUsd?: number | null;
  customMaxXApiSpendUsd?: number | null;
  whiteLabelBranding: {
    companyName: string;
    logoUrl: string;
    primaryColor: string;
    language: 'en' | 'es' | 'pt-BR';
  };
}

// In-memory store used as fallback when Supabase credentials are not yet configured
const fallbackStore: {
  globalConfig: GlobalAdminConfigState;
  plans: Record<string, PlanTemplateState>;
  tenants: Record<string, TenantOverrideState>;
} = {
  globalConfig: {
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Asra3',
    brandLogoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || 'https://asra3.com/logo.png',
    brandPrimaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#4F46E5',
    enforceHeadlessOAuth: true,
    enabledPlatforms: [...ALL_SOCIAL_PLATFORMS],
    enabledAdPlatforms: [...ALL_AD_PLATFORMS],
    enabledOAuthScopes: [...ALL_OAUTH_SCOPES],
    enabledSubServices: [...ALL_SUB_SERVICES],
    defaultMaxSupportCostUsd: 3.0,
  },
  plans: {
    starter: {
      planKey: 'starter',
      displayName: 'Starter',
      monthlyPriceUsd: 29,
      enabledSubServices: ['core_connect', 'publishing', 'analytics'],
      allowedPlatforms: [
        'instagram',
        'facebook',
        'tiktok',
        'linkedin',
        'threads',
        'pinterest',
        'bluesky',
        'youtube',
      ],
      allowedAdPlatforms: [],
      allowedOAuthScopes: ['posting', 'analytics'],
      disabledZernioResourceGroups: ['ads', 'telephony', 'billing'],
      maxConnectedAccounts: 5,
      maxMonthlyPosts: 300,
      maxMonthlyMessages: 1000,
      maxManagedAds: 0,
      maxPhoneNumbers: 0,
      maxAiSupportUsd: 5,
      maxXApiSpendUsd: 0,
    },
    growth: {
      planKey: 'growth',
      displayName: 'Growth & Inbox',
      monthlyPriceUsd: 79,
      enabledSubServices: [
        'core_connect',
        'publishing',
        'inbox_crm',
        'analytics',
        'telephony',
        'commerce_local',
        'support_ai',
      ],
      allowedPlatforms: [
        'instagram',
        'facebook',
        'tiktok',
        'linkedin',
        'twitter',
        'youtube',
        'threads',
        'pinterest',
        'reddit',
        'bluesky',
        'googlebusiness',
        'telegram',
        'discord',
        'slack',
        'shopify',
        'wordpress',
      ],
      allowedAdPlatforms: [],
      allowedOAuthScopes: ['posting', 'analytics', 'comments', 'messaging'],
      disabledZernioResourceGroups: ['ads', 'telephony', 'billing'],
      maxConnectedAccounts: 15,
      maxMonthlyPosts: 2000,
      maxMonthlyMessages: 10000,
      maxManagedAds: 0,
      maxPhoneNumbers: 1,
      maxAiSupportUsd: 20,
      maxXApiSpendUsd: 15,
    },
    agency: {
      planKey: 'agency',
      displayName: 'Agency Omnichannel + Ads',
      monthlyPriceUsd: 199,
      enabledSubServices: [...ALL_SUB_SERVICES],
      allowedPlatforms: [...ALL_SOCIAL_PLATFORMS],
      allowedAdPlatforms: [...ALL_AD_PLATFORMS],
      allowedOAuthScopes: [...ALL_OAUTH_SCOPES],
      disabledZernioResourceGroups: ['billing'],
      maxConnectedAccounts: 50,
      maxMonthlyPosts: 10000,
      maxMonthlyMessages: 50000,
      maxManagedAds: 500,
      maxPhoneNumbers: 5,
      maxAiSupportUsd: 50,
      maxXApiSpendUsd: 50,
    },
    enterprise: {
      planKey: 'enterprise',
      displayName: 'Enterprise Full White-Label',
      monthlyPriceUsd: 499,
      enabledSubServices: [...ALL_SUB_SERVICES],
      allowedPlatforms: [...ALL_SOCIAL_PLATFORMS],
      allowedAdPlatforms: [...ALL_AD_PLATFORMS],
      allowedOAuthScopes: [...ALL_OAUTH_SCOPES],
      disabledZernioResourceGroups: [],
      maxConnectedAccounts: 500,
      maxMonthlyPosts: 100000,
      maxMonthlyMessages: 500000,
      maxManagedAds: 5000,
      maxPhoneNumbers: 50,
      maxAiSupportUsd: 100,
      maxXApiSpendUsd: 250,
    },
  },
  tenants: {
    'org_demo_acme': {
      organizationId: 'org_demo_acme',
      organizationName: 'Acme Digital Agency',
      slug: 'acme-digital',
      zernioProfileId: '66a1f0c2a4b9d3e8f1a2b3c4',
      zernioScopedKeyId: '6507a1b2c3d4e5f6a7b8c9d0',
      zernioScopedKeyPrefix: 'zrk_acme_live_98f2',
      planKey: 'agency',
      status: 'active',
      forceHeadlessMode: true,
      whiteLabelBranding: {
        companyName: 'Acme Social Cloud',
        logoUrl: 'https://acme.example.com/logo.png',
        primaryColor: '#4F46E5',
        language: 'en',
      },
    },
    'org_demo_nova': {
      organizationId: 'org_demo_nova',
      organizationName: 'Nova Retail Group',
      slug: 'nova-retail',
      zernioProfileId: '66a1f0c2a4b9d3e8f1a2b999',
      zernioScopedKeyId: null,
      zernioScopedKeyPrefix: null,
      planKey: 'growth',
      status: 'active',
      forceHeadlessMode: true,
      whiteLabelBranding: {
        companyName: 'Nova Commerce Hub',
        logoUrl: 'https://nova.example.com/logo.png',
        primaryColor: '#0EA5E9',
        language: 'en',
      },
    },
  },
};

export function getFallbackStore() {
  return fallbackStore;
}

function intersect<T>(a: readonly T[], b: readonly T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

/**
 * Resolves the effective policy for a tenant by intersecting:
 * 1. Super Admin Global Config (`platform_global_config`)
 * 2. Tenant's Subscription Plan Template (`subscription_plan_templates`)
 * 3. Per-Tenant Super Admin Overrides (`org_feature_overrides`)
 */
export async function resolveEffectiveTenantPolicy(
  organizationId: string
): Promise<EffectiveTenantPolicy> {
  const supabase = createSupabaseAdminClient();

  let globalCfg = fallbackStore.globalConfig;
  let tenant =
    fallbackStore.tenants[organizationId] ||
    fallbackStore.tenants['org_demo_acme'];

  if (supabase) {
    const [{ data: dbGlobal }, { data: dbOrg }, { data: dbOverride }] =
      await Promise.all([
        supabase.from('platform_global_config').select('*').eq('id', 1).maybeSingle(),
        supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .maybeSingle(),
        supabase
          .from('org_feature_overrides')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle(),
      ]);

    if (dbGlobal) {
      globalCfg = {
        brandName: dbGlobal.brand_name,
        brandLogoUrl: dbGlobal.brand_logo_url || '',
        brandPrimaryColor: dbGlobal.brand_primary_color,
        enforceHeadlessOAuth: dbGlobal.enforce_headless_oauth,
        enabledPlatforms: dbGlobal.enabled_platforms,
        enabledAdPlatforms: dbGlobal.enabled_ad_platforms,
        enabledOAuthScopes: dbGlobal.enabled_oauth_scopes,
        enabledSubServices: dbGlobal.enabled_subservices,
        defaultMaxSupportCostUsd: Number(dbGlobal.default_max_support_cost_usd),
      };
    }

    if (dbOrg) {
      tenant = {
        organizationId: dbOrg.id,
        organizationName: dbOrg.name,
        slug: dbOrg.slug,
        zernioProfileId: dbOrg.zernio_profile_id,
        zernioScopedKeyId: dbOrg.zernio_scoped_key_id,
        zernioScopedKeyPrefix: dbOrg.zernio_scoped_key_prefix,
        planKey: dbOrg.plan_key,
        status: dbOrg.status,
        forceHeadlessMode: dbOverride?.force_headless_mode ?? true,
        customEnabledSubServices: dbOverride?.custom_enabled_subservices,
        customAllowedPlatforms: dbOverride?.custom_allowed_platforms,
        customAllowedAdPlatforms: dbOverride?.custom_allowed_ad_platforms,
        customAllowedOAuthScopes: dbOverride?.custom_allowed_oauth_scopes,
        customDisabledResourceGroups: dbOverride?.custom_disabled_resource_groups,
        customMaxConnectedAccounts: dbOverride?.custom_max_connected_accounts,
        customMaxMonthlyPosts: dbOverride?.custom_max_monthly_posts,
        customMaxMonthlyMessages: dbOverride?.custom_max_monthly_messages,
        customMaxManagedAds: dbOverride?.custom_max_managed_ads,
        customMaxPhoneNumbers: dbOverride?.custom_max_phone_numbers,
        customMaxAiSupportUsd: dbOverride?.custom_max_ai_support_usd
          ? Number(dbOverride.custom_max_ai_support_usd)
          : null,
        customMaxXApiSpendUsd: dbOverride?.custom_max_x_api_spend_usd
          ? Number(dbOverride.custom_max_x_api_spend_usd)
          : null,
        whiteLabelBranding: dbOrg.white_label_config || {
          companyName: dbOrg.name,
          logoUrl: '',
          primaryColor: globalCfg.brandPrimaryColor,
          language: 'en',
        },
      };
    }
  }

  const plan =
    fallbackStore.plans[tenant.planKey] || fallbackStore.plans['agency'];

  const tenantSubServices =
    tenant.customEnabledSubServices && tenant.customEnabledSubServices.length > 0
      ? tenant.customEnabledSubServices
      : plan.enabledSubServices;

  const tenantPlatforms =
    tenant.customAllowedPlatforms && tenant.customAllowedPlatforms.length > 0
      ? tenant.customAllowedPlatforms
      : plan.allowedPlatforms;

  const tenantAdPlatforms =
    tenant.customAllowedAdPlatforms && tenant.customAllowedAdPlatforms.length > 0
      ? tenant.customAllowedAdPlatforms
      : plan.allowedAdPlatforms;

  const tenantScopes =
    tenant.customAllowedOAuthScopes && tenant.customAllowedOAuthScopes.length > 0
      ? tenant.customAllowedOAuthScopes
      : plan.allowedOAuthScopes;

  return {
    organizationId: tenant.organizationId,
    organizationName: tenant.organizationName,
    zernioProfileId: tenant.zernioProfileId,
    planKey: tenant.planKey,
    status: tenant.status,
    enforceHeadlessOAuth:
      globalCfg.enforceHeadlessOAuth || tenant.forceHeadlessMode,
    whiteLabelBranding: tenant.whiteLabelBranding,
    // Global Admin switch is always the ceiling
    enabledSubServices: intersect(globalCfg.enabledSubServices, tenantSubServices),
    allowedPlatforms: intersect(globalCfg.enabledPlatforms, tenantPlatforms),
    allowedAdPlatforms: intersect(globalCfg.enabledAdPlatforms, tenantAdPlatforms),
    allowedOAuthScopes: intersect(globalCfg.enabledOAuthScopes, tenantScopes),
    disabledZernioResourceGroups:
      tenant.customDisabledResourceGroups ?? plan.disabledZernioResourceGroups,
    quotas: {
      maxConnectedAccounts:
        tenant.customMaxConnectedAccounts ?? plan.maxConnectedAccounts,
      maxMonthlyPosts: tenant.customMaxMonthlyPosts ?? plan.maxMonthlyPosts,
      maxMonthlyMessages:
        tenant.customMaxMonthlyMessages ?? plan.maxMonthlyMessages,
      maxManagedAds: tenant.customMaxManagedAds ?? plan.maxManagedAds,
      maxPhoneNumbers: tenant.customMaxPhoneNumbers ?? plan.maxPhoneNumbers,
      maxAiSupportUsd: tenant.customMaxAiSupportUsd ?? plan.maxAiSupportUsd,
      maxXApiSpendUsd: tenant.customMaxXApiSpendUsd ?? plan.maxXApiSpendUsd,
    },
  };
}

export async function assertSubServiceAllowed(
  organizationId: string,
  subService: SubServiceKey
): Promise<EffectiveTenantPolicy> {
  const policy = await resolveEffectiveTenantPolicy(organizationId);

  if (policy.status !== 'active') {
    throw new Error(
      `Tenant organization "${policy.organizationName}" is currently ${policy.status}. Contact Super Admin.`
    );
  }

  if (!policy.enabledSubServices.includes(subService)) {
    throw new Error(
      `Sub-service "${subService}" is disabled for organization "${policy.organizationName}" (Plan: ${policy.planKey}). Super Admin or plan upgrade required.`
    );
  }

  return policy;
}

/**
 * Computes the exact `scopes` parameter for `GET /v1/connect/{platform}`:
 * - Filters requested scopes against Super Admin + Tenant allowed scopes
 * - Automatically returns `undefined` for platforms where Zernio forbids `scopes`
 *   (Bluesky, Telegram, Discord, Snapchat, WhatsApp — per zernio.txt line 14758)
 */
export function resolveConnectScopesParam(
  policy: EffectiveTenantPolicy,
  platform: SocialPlatform,
  requestedScopes?: OAuthScopeArea[]
): string | undefined {
  if (!PLATFORMS_SUPPORTING_SCOPES.has(platform)) {
    return undefined;
  }

  const desired =
    requestedScopes && requestedScopes.length > 0
      ? requestedScopes
      : policy.allowedOAuthScopes;

  const permitted = desired.filter((s) =>
    policy.allowedOAuthScopes.includes(s)
  );

  if (permitted.length === 0) {
    throw new Error(
      `No permitted OAuth scopes available for platform "${platform}" under tenant "${policy.organizationName}".`
    );
  }

  // If all 5 scopes are permitted and requested, we can still pass them explicitly
  // so the tenant never requests a scope the admin disabled.
  return permitted.join(',');
}
