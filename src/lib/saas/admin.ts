import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ALL_AD_PLATFORMS,ALL_OAUTH_SCOPES,ALL_SOCIAL_PLATFORMS,ALL_SUB_SERVICES,ALL_ZERNIO_RESOURCE_GROUPS } from '@/types/platform';
import { saasDatabase,saasRpc } from './storage';
import { globalState,planState,tenantState } from './policy';

const fields: Record<string,Record<string,string>> = {
 global:{brandName:'brand_name',brandLogoUrl:'brand_logo_url',brandPrimaryColor:'brand_primary_color',enforceHeadlessOAuth:'enforce_headless_oauth',enabledPlatforms:'enabled_platforms',enabledAdPlatforms:'enabled_ad_platforms',enabledOAuthScopes:'enabled_oauth_scopes',enabledSubServices:'enabled_subservices',defaultMaxSupportCostUsd:'default_max_support_cost_usd'},
 plan:{displayName:'display_name',monthlyPriceUsd:'monthly_price_usd',enabledSubServices:'enabled_subservices',allowedPlatforms:'allowed_platforms',allowedAdPlatforms:'allowed_ad_platforms',allowedOAuthScopes:'allowed_oauth_scopes',disabledZernioResourceGroups:'disabled_zernio_resource_groups',maxConnectedAccounts:'max_connected_accounts',maxMonthlyPosts:'max_monthly_posts',maxMonthlyMessages:'max_monthly_messages',maxManagedAds:'max_managed_ads',maxPhoneNumbers:'max_phone_numbers',maxAiSupportUsd:'max_ai_support_usd',maxXApiSpendUsd:'max_x_api_spend_usd'},
 tenant:{planKey:'plan_key',status:'status',whiteLabelBranding:'white_label_config',forceHeadlessMode:'force_headless_mode',customEnabledSubServices:'custom_enabled_subservices',customAllowedPlatforms:'custom_allowed_platforms',customAllowedAdPlatforms:'custom_allowed_ad_platforms',customAllowedOAuthScopes:'custom_allowed_oauth_scopes',customDisabledResourceGroups:'custom_disabled_resource_groups',customMaxConnectedAccounts:'custom_max_connected_accounts',customMaxMonthlyPosts:'custom_max_monthly_posts',customMaxMonthlyMessages:'custom_max_monthly_messages',customMaxManagedAds:'custom_max_managed_ads',customMaxPhoneNumbers:'custom_max_phone_numbers',customMaxAiSupportUsd:'custom_max_ai_support_usd',customMaxXApiSpendUsd:'custom_max_x_api_spend_usd'},
};
function validated(kind:string,patch:unknown) {
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TenantAccessError(400,'Expected a settings patch.');
 const result:Record<string,unknown>={};
 for(const [key,value] of Object.entries(patch)) {
  const column=fields[kind][key];if(!column)throw new TenantAccessError(400,`Unsupported setting: ${key}. Provider credentials must be configured through server secrets.`);
  const nullable=kind==='tenant'&&key.startsWith('custom');if(value===null&&nullable){result[column]=null;continue;}
  const list=key.includes('SubServices')?ALL_SUB_SERVICES:key.includes('AdPlatforms')?ALL_AD_PLATFORMS:key.includes('Platforms')?ALL_SOCIAL_PLATFORMS:key.includes('Scopes')?ALL_OAUTH_SCOPES:key.includes('ResourceGroups')?ALL_ZERNIO_RESOURCE_GROUPS:null;
  if(list){if(!Array.isArray(value)||value.some(v=>!(list as readonly unknown[]).includes(v)))throw new TenantAccessError(400,`Invalid list: ${key}`);result[column]=[...new Set(value)];continue;}
  if(/^(custom)?[Mm]ax/.test(key)||key==='monthlyPriceUsd'||key==='defaultMaxSupportCostUsd'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>9007199254740991||(!key.endsWith('Usd')&&!Number.isSafeInteger(value)))throw new TenantAccessError(400,`Invalid nonnegative limit: ${key}`);}
  else if(key==='forceHeadlessMode'||key==='enforceHeadlessOAuth'){if(typeof value!=='boolean')throw new TenantAccessError(400,'Expected a boolean.');}
  else if(key==='status'){if(!['active','suspended','past_due','Archived'].includes(value as string))throw new TenantAccessError(400,'Invalid workspace status.');}
  else if(key==='whiteLabelBranding'){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['companyName','logoUrl','primaryColor','language'].includes(k)))throw new TenantAccessError(400,'Invalid branding settings.');}
  else if(typeof value!=='string'||value.length>2000)throw new TenantAccessError(400,`Invalid text: ${key}`);
  result[column]=value;
 }
 return result;
}
export class SaasAdminService {
 static async snapshot(){
  const db=saasDatabase();const [g,p,o]=await Promise.all([db.from('platform_global_config').select('*').eq('id',1).maybeSingle(),db.from('subscription_plan_templates').select('*').order('monthly_price_usd'),db.from('organizations').select('*,org_feature_overrides(*)').order('created_at')]);
  if(g.error||p.error||o.error||!g.data||!p.data||!o.data)throw new TenantAccessError(503,'Administrator settings could not be verified.');
  return {globalConfig:globalState(g.data),plans:p.data.map(planState),tenants:o.data.map(r=>tenantState(r,Array.isArray(r.org_feature_overrides)?r.org_feature_overrides[0]||{}:r.org_feature_overrides||{}))};
 }
 static async patch(kind:'global'|'plan'|'tenant',resource:string,patch:unknown){
  const data=await saasRpc('saas_admin_patch',{p_kind:kind,p_resource:resource,p_patch:validated(kind,patch),p_actor_id:'usr_super_admin'});
  return kind==='global'?globalState(data):kind==='plan'?planState(data):tenantState(data,data.override||{});
 }
 static async archive(organizationId:string){return saasRpc('saas_archive_workspace',{p_organization_id:organizationId,p_actor_id:'usr_super_admin'});}
}
