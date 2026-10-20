import { strictTenantPolicy } from '@/lib/saas/policy';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import fs from 'fs';
import path from 'path';
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
  zernioApiKey?: string;
  zernioBaseUrl?: string;
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
  tenants: {},
};

const DATA_DIR = path.join(process.cwd(), '.data');
const ADMIN_STORE_FILE = path.join(DATA_DIR, 'admin-store.json');
let storeLoadedFromDisk = false;

export function saveFallbackStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      ADMIN_STORE_FILE,
      JSON.stringify(fallbackStore, null, 2),
      'utf-8'
    );
  } catch {
    // Ignore file write errors in read-only environments
  }
}

export function getFallbackStore() {
  if (!storeLoadedFromDisk) {
    storeLoadedFromDisk = true;
    try {
      if (fs.existsSync(ADMIN_STORE_FILE)) {
        const persisted = JSON.parse(
          fs.readFileSync(ADMIN_STORE_FILE, 'utf-8')
        );
        if (persisted.globalConfig) {
          fallbackStore.globalConfig = {
            ...fallbackStore.globalConfig,
            ...persisted.globalConfig,
          };
        }
        if (persisted.plans) {
          fallbackStore.plans = {
            ...fallbackStore.plans,
            ...persisted.plans,
          };
        }
        if (persisted.tenants) {
          const cleanTenants: Record<string, TenantOverrideState> = {};
          for (const [id, t] of Object.entries(
            persisted.tenants as Record<string, TenantOverrideState>
          )) {
            if (id !== 'org_demo_acme' && id !== 'org_demo_nova') {
              cleanTenants[id] = t;
            }
          }
          fallbackStore.tenants = cleanTenants;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
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
  return strictTenantPolicy(organizationId);
}

export async function assertSubServiceAllowed(
  organizationId: string,
  subService: SubServiceKey
): Promise<EffectiveTenantPolicy> {
  const policy = await resolveEffectiveTenantPolicy(organizationId);

  if (policy.status !== 'active') {
    throw new TenantAccessError(403,
      `Tenant organization "${policy.organizationName}" is currently ${policy.status}. Contact Super Admin.`
    );
  }

  if (!policy.enabledSubServices.includes(subService)) {
    throw new TenantAccessError(403,
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
