import { TenantAccessError } from '@/lib/auth/tenant-access';
import { saasDatabase } from './storage';
import type { GlobalAdminConfigState, PlanTemplateState, TenantOverrideState } from '@/lib/zernio/policy-engine';
import type { EffectiveTenantPolicy } from '@/types/platform';

export function globalState(r: any): GlobalAdminConfigState { return { brandName:r.brand_name,brandLogoUrl:r.brand_logo_url||'',brandPrimaryColor:r.brand_primary_color,enforceHeadlessOAuth:r.enforce_headless_oauth,enabledPlatforms:r.enabled_platforms,enabledAdPlatforms:r.enabled_ad_platforms,enabledOAuthScopes:r.enabled_oauth_scopes,enabledSubServices:r.enabled_subservices,defaultMaxSupportCostUsd:Number(r.default_max_support_cost_usd) }; }
export function planState(r: any): PlanTemplateState { return { planKey:r.plan_key,displayName:r.display_name,monthlyPriceUsd:Number(r.monthly_price_usd),enabledSubServices:r.enabled_subservices,allowedPlatforms:r.allowed_platforms,allowedAdPlatforms:r.allowed_ad_platforms,allowedOAuthScopes:r.allowed_oauth_scopes,disabledZernioResourceGroups:r.disabled_zernio_resource_groups,maxConnectedAccounts:r.max_connected_accounts,maxMonthlyPosts:r.max_monthly_posts,maxMonthlyMessages:r.max_monthly_messages,maxManagedAds:r.max_managed_ads,maxPhoneNumbers:r.max_phone_numbers,maxAiSupportUsd:Number(r.max_ai_support_usd),maxXApiSpendUsd:Number(r.max_x_api_spend_usd) }; }
export function tenantState(r: any,ov: any = {}): TenantOverrideState {
  const number = (v: unknown) => v == null ? null : Number(v);
  return { organizationId:r.id,organizationName:r.name,slug:r.slug,zernioProfileId:r.zernio_profile_id,zernioScopedKeyId:r.zernio_scoped_key_id,zernioScopedKeyPrefix:r.zernio_scoped_key_prefix,planKey:r.plan_key,status:r.status,forceHeadlessMode:ov.force_headless_mode??true,customEnabledSubServices:ov.custom_enabled_subservices,customAllowedPlatforms:ov.custom_allowed_platforms,customAllowedAdPlatforms:ov.custom_allowed_ad_platforms,customAllowedOAuthScopes:ov.custom_allowed_oauth_scopes,customDisabledResourceGroups:ov.custom_disabled_resource_groups,customMaxConnectedAccounts:ov.custom_max_connected_accounts,customMaxMonthlyPosts:ov.custom_max_monthly_posts,customMaxMonthlyMessages:ov.custom_max_monthly_messages,customMaxManagedAds:ov.custom_max_managed_ads,customMaxPhoneNumbers:ov.custom_max_phone_numbers,customMaxAiSupportUsd:number(ov.custom_max_ai_support_usd),customMaxXApiSpendUsd:number(ov.custom_max_x_api_spend_usd),whiteLabelBranding:r.white_label_config };
}
export async function strictTenantPolicy(organizationId: string): Promise<EffectiveTenantPolicy> {
  const db = saasDatabase();
  const [g,o,v] = await Promise.all([db.from('platform_global_config').select('*').eq('id',1).maybeSingle(),db.from('organizations').select('*').eq('id',organizationId).maybeSingle(),db.from('org_feature_overrides').select('*').eq('organization_id',organizationId).maybeSingle()]);
  if(g.error||o.error||v.error||!g.data) throw new TenantAccessError(503,'Tenant policy verification is unavailable.');
  if(!o.data) throw new TenantAccessError(403,'Unknown workspace.');
  if(!['active','suspended','past_due','Archived'].includes(o.data.status))throw new TenantAccessError(503,'Invalid workspace policy state.');
  const p = await db.from('subscription_plan_templates').select('*').eq('plan_key',o.data.plan_key).maybeSingle();
  if(p.error||!p.data) throw new TenantAccessError(503,'Subscription policy is unavailable.');
  if(p.data.is_active!==true) throw new TenantAccessError(403,'This subscription policy is inactive.');
  const global=globalState(g.data),tenant=tenantState(o.data,v.data||{}),plan=planState(p.data);
  const intersect=(a: unknown,b: unknown): any[]=>{if(!Array.isArray(a)||!Array.isArray(b)||[...a,...b].some(x=>typeof x!=='string'))throw new TenantAccessError(503,'Invalid policy lists.');return a.filter(x=>b.includes(x));};
  const quota=(custom: number|null|undefined,base: number)=>{const n=custom??base;if(!Number.isFinite(n)||n<0)throw new TenantAccessError(503,'Invalid policy quota.');return n;};
  const disabled=tenant.customDisabledResourceGroups??plan.disabledZernioResourceGroups;
  if(!Array.isArray(disabled))throw new TenantAccessError(503,'Invalid resource policy.');
  return {organizationId:tenant.organizationId,organizationName:tenant.organizationName,zernioProfileId:tenant.zernioProfileId,planKey:tenant.planKey,status:tenant.status,enforceHeadlessOAuth:global.enforceHeadlessOAuth||tenant.forceHeadlessMode,whiteLabelBranding:tenant.whiteLabelBranding,
    enabledSubServices:intersect(global.enabledSubServices,tenant.customEnabledSubServices??plan.enabledSubServices),allowedPlatforms:intersect(global.enabledPlatforms,tenant.customAllowedPlatforms??plan.allowedPlatforms),allowedAdPlatforms:intersect(global.enabledAdPlatforms,tenant.customAllowedAdPlatforms??plan.allowedAdPlatforms),allowedOAuthScopes:intersect(global.enabledOAuthScopes,tenant.customAllowedOAuthScopes??plan.allowedOAuthScopes),disabledZernioResourceGroups:disabled,
    quotas:{maxConnectedAccounts:quota(tenant.customMaxConnectedAccounts,plan.maxConnectedAccounts),maxMonthlyPosts:quota(tenant.customMaxMonthlyPosts,plan.maxMonthlyPosts),maxMonthlyMessages:quota(tenant.customMaxMonthlyMessages,plan.maxMonthlyMessages),maxManagedAds:quota(tenant.customMaxManagedAds,plan.maxManagedAds),maxPhoneNumbers:quota(tenant.customMaxPhoneNumbers,plan.maxPhoneNumbers),maxAiSupportUsd:quota(tenant.customMaxAiSupportUsd,plan.maxAiSupportUsd),maxXApiSpendUsd:quota(tenant.customMaxXApiSpendUsd,plan.maxXApiSpendUsd)}};
}
