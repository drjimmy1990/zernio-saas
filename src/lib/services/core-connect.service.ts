import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioApiException, ZernioClient, zernioClient } from '@/lib/zernio/client';
import {
  assertSubServiceAllowed,
  getFallbackStore,
  resolveConnectScopesParam,
} from '@/lib/zernio/policy-engine';
import { verifyReconnectIdentity } from '@/lib/accounts/lifecycle';
import { reserveConnectionCapacity } from '@/lib/billing/connections';
import type {
  OAuthScopeArea,
  SecondarySelectionStep,
  SocialPlatform,
} from '@/types/platform';

/**
 * SUB-SERVICE 1: CORE TENANT & WHITE-LABEL HEADLESS CONNECT
 * - Maps 1 Supabase Organization -> 1 Zernio Profile (`externalId = organizationId`)
 * - Enforces Super Admin allowed platforms & OAuth scopes
 * - Runs `headless=true` OAuth so your own UI renders Page/Org/Board/Location/Number pickers
 * - Supports credential & token onboarding (Bluesky, WordPress, Shopify, Telegram, WhatsApp)
 * - Monitors account health & token expiration (`GET /v1/accounts/health`)
 */
export class CoreConnectService {
  /**
   * Ensures a Zernio Profile exists for the tenant organization.
   * Safe against retries: handles `409 profile_external_id_conflict` by reading `details.existingProfileId`.
   * Ref: zernio.txt lines 19270-19330 & 19631-19643
   */
  public static async ensureTenantProfile(
    organizationId: string,
    organizationName?: string
  ): Promise<string> {
    const policy = await assertSubServiceAllowed(organizationId, 'core_connect');
    const name = organizationName || policy.organizationName;

    if (!zernioClient.isConfigured()) {
      throw new ZernioApiException({
        status: 503,
        error: 'Zernio is not configured. Contact your administrator to enable account connections.',
        code: 'provider_not_configured',
      });
    }

    if (policy.zernioProfileId) {
      const { data } = await zernioClient.request<{
        profile?: { _id: string; externalId?: string | null };
      }>({ method: 'GET', path: `/profiles/${encodeURIComponent(policy.zernioProfileId)}` });
      if (data.profile?._id !== policy.zernioProfileId || data.profile.externalId !== organizationId) {
        throw new ZernioApiException({
          status: 409,
          error: 'The saved Zernio profile does not match this workspace. Contact your administrator.',
          code: 'profile_mapping_mismatch',
        });
      }
      return policy.zernioProfileId;
    }

    let profileId: string;
    try {
      const { data } = await zernioClient.request<{
        profile: { _id: string; name: string; externalId: string };
      }>({
        method: 'POST',
        path: '/profiles',
        idempotencyKey: ZernioClient.newIdempotencyKey(`profile-${organizationId}`),
        body: {
          name,
          externalId: organizationId,
        },
      });
      if (data.profile?.externalId !== organizationId) {
        throw new ZernioApiException({ status: 502, error: 'Zernio returned a profile for a different workspace.', code: 'profile_mapping_mismatch' });
      }
      profileId = data.profile?._id;
    } catch (err) {
      if (
        err instanceof ZernioApiException &&
        err.envelope.status === 409 &&
        err.envelope.code === 'profile_external_id_conflict' &&
        typeof err.envelope.details?.existingProfileId === 'string'
      ) {
        profileId = err.envelope.details.existingProfileId;
        const { data } = await zernioClient.request<{ profile?: { _id: string; externalId?: string | null } }>({
          method: 'GET', path: `/profiles/${encodeURIComponent(profileId)}`,
        });
        if (data.profile?._id !== profileId || data.profile.externalId !== organizationId) {
          throw new ZernioApiException({ status: 409, error: 'The existing Zernio profile belongs to a different workspace.', code: 'profile_mapping_mismatch' });
        }
      } else {
        throw err;
      }
    }

    if (typeof profileId !== 'string' || !/^[a-f0-9]{24}$/i.test(profileId)) {
      throw new ZernioApiException({
        status: 502,
        error: 'Zernio did not return a valid profile ID.',
        code: 'invalid_provider_response',
      });
    }

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase
        .from('organizations')
        .update({ zernio_profile_id: profileId, updated_at: new Date().toISOString() })
        .eq('id', organizationId);
      if (error) throw new Error('Could not save the Zernio profile mapping. Please retry.');
    }

    const store = getFallbackStore();
    if (store.tenants[organizationId]) {
      store.tenants[organizationId].zernioProfileId = profileId;
    }

    return profileId;
  }

  /**
   * Starts a White-Label Headless OAuth flow (`GET /v1/connect/{platform}`).
   * - Verifies the platform is enabled by Super Admin & Tenant Plan
   * - Filters OAuth `scopes` through the Super Admin Policy Engine
   * - Sets `headless=true` so Zernio never shows a Zernio-hosted selection screen
   * Ref: zernio.txt lines 14673-14823
   */
  public static async startHeadlessOAuth(params: {
    organizationId: string;
    platform: SocialPlatform;
    requestedScopes?: OAuthScopeArea[];
    redirectUrl: string;
    shopDomain?: string; // Required when platform === 'shopify'
    loginMethod?: 'instagram_login' | 'facebook_login'; // Optional for Instagram
    whatsappOnboarding?: 'api' | 'business_app';
    whatsappSignupMode?: 'hosted' | 'headless';
    reconnectAccountId?: string;
  }) {
    if (params.loginMethod && (params.platform !== 'instagram' || !['instagram_login', 'facebook_login'].includes(params.loginMethod))) {
      throw new ZernioApiException({ status: 400, error: 'Choose a supported Instagram login method.' });
    }
    if (params.whatsappOnboarding && !['api', 'business_app'].includes(params.whatsappOnboarding) ||
        params.whatsappSignupMode && !['hosted', 'headless'].includes(params.whatsappSignupMode)) {
      throw new ZernioApiException({ status: 400, error: 'Choose a supported WhatsApp onboarding and signup mode.' });
    }
    const policy = await assertSubServiceAllowed(
      params.organizationId,
      'core_connect'
    );

    if (!policy.allowedPlatforms.includes(params.platform)) {
      throw new Error(
        `Platform "${params.platform}" is disabled by Super Admin or not included in plan "${policy.planKey}".`
      );
    }

    const profileId = await this.ensureTenantProfile(params.organizationId);
    const reconnect = params.reconnectAccountId
      ? await verifyReconnectIdentity(params.organizationId, params.reconnectAccountId, params.platform) : undefined;
    if (!reconnect) await reserveConnectionCapacity(params.organizationId, profileId, params.platform);
    const scopesParam = resolveConnectScopesParam(
      policy,
      params.platform,
      params.requestedScopes
    );
    const isWhatsAppHosted =
      params.platform === 'whatsapp' &&
      (params.whatsappSignupMode || 'hosted') === 'hosted';
    const headless = params.platform === 'whatsapp' ? !isWhatsAppHosted : policy.enforceHeadlessOAuth;

    if (!zernioClient.isConfigured()) {
      const simulatedCallback = new URL(params.redirectUrl);
      simulatedCallback.searchParams.set('profileId', profileId);
      simulatedCallback.searchParams.set('platform', params.platform);
      simulatedCallback.searchParams.set('simulated', '1');
      if (
        ['facebook', 'linkedin', 'pinterest', 'googlebusiness', 'snapchat'].includes(
          params.platform
        )
      ) {
        const stepMap: Record<string, string> = {
          facebook: 'select_page',
          linkedin: 'select_organization',
          pinterest: 'select_board',
          googlebusiness: 'select_location',
          snapchat: 'select_public_profile',
        };
        simulatedCallback.searchParams.set('step', stepMap[params.platform]);
        simulatedCallback.searchParams.set('tempToken', 'sim_temp_token_991');
        simulatedCallback.searchParams.set(
          'userProfile',
          encodeURIComponent(
            encodeURIComponent(
              JSON.stringify({
                id: 'usr_101',
                username: 'brand_admin',
                displayName: policy.organizationName,
              })
            )
          )
        );
      } else {
        simulatedCallback.searchParams.set('connected', params.platform);
        simulatedCallback.searchParams.set(
          'accountId',
          `acc_${params.platform}_${Date.now().toString(36)}`
        );
        simulatedCallback.searchParams.set(
          'username',
          `${policy.organizationName.toLowerCase().replace(/\s+/g, '')}_${params.platform}`
        );
      }

      return {
        simulated: true,
        profileId,
        platform: params.platform,
        headless,
        appliedScopes: scopesParam ? scopesParam.split(',') : ['all_default'],
        authUrl: simulatedCallback.toString(),
      };
    }

    const { data } = await zernioClient.request<{
      authUrl: string;
      state?: string;
    }>({
      method: 'GET',
      path: `/connect/${params.platform}`,
      query: {
        profileId,
        redirect_url: params.redirectUrl,
        ...(reconnect || {}),
        ...(isWhatsAppHosted
          ? {
              signup: 'hosted',
              brandName: 'Asra3',
              primaryColor: '#0D9488',
            }
          : { headless }),
        ...(scopesParam ? { scopes: scopesParam } : {}),
        ...(params.shopDomain ? { shop: params.shopDomain } : {}),
        ...(params.platform === 'instagram' ? { loginMethod: reconnect?.loginMethod || params.loginMethod || 'instagram_login' } : {}),
        ...(params.whatsappOnboarding
          ? { onboarding: params.whatsappOnboarding }
          : {}),
      },
    });

    return {
      simulated: false,
      profileId,
      platform: params.platform,
      headless,
      appliedScopes: scopesParam ? scopesParam.split(',') : ['all_default'],
      authUrl: data.authUrl,
      state: data.state,
    };
  }

  /**
   * Lists selectable entities during a `headless=true` secondary selection step
   * so your startup renders its own Page/Org/Board/Location/Profile/Number picker modal.
   * Ref: zernio.txt lines 14760-14870 & 45593-45677
   */
  public static async listHeadlessSelectableEntities(params: {
    organizationId: string;
    step: SecondarySelectionStep;
    tempToken: string;
    connectToken?: string;
  }) {
    const profileId = await this.ensureTenantProfile(params.organizationId);

    if (!zernioClient.isConfigured() || params.tempToken.startsWith('sim_')) {
      return {
        simulated: true,
        step: params.step,
        items: [
          {
            id: 'entity_primary_01',
            name: 'Flagship Brand Official',
            username: 'flagship_official',
            category: 'Brand / Retail',
          },
          {
            id: 'entity_regional_02',
            name: 'EMEA Regional Page',
            username: 'flagship_emea',
            category: 'Regional Branch',
          },
        ],
      };
    }

    const endpointByStep: Record<SecondarySelectionStep, string> = {
      select_page: '/connect/facebook/select-page',
      select_organization: '/connect/linkedin/select-organization',
      select_board: '/connect/pinterest/select-board',
      select_location: '/connect/googlebusiness/select-location',
      select_public_profile: '/connect/snapchat/select-profile',
      select_phone_number: '/connect/whatsapp/select-phone-number',
      select_account: '/connect/instagram/select-account',
    };

    const tokenInHeader = params.step === 'select_page' || params.step === 'select_account';
    const { data } = await zernioClient.request<Record<string, unknown>>({
      method: 'GET',
      path: endpointByStep[params.step],
      query: { profileId, ...(tokenInHeader ? {} : { tempToken: params.tempToken }) },
      extraHeaders: { ...(tokenInHeader ? { 'X-Temp-Token': params.tempToken } : {}), ...(params.connectToken ? { 'X-Connect-Token': params.connectToken } : {}) },
    });

    return {
      simulated: false,
      step: params.step,
      raw: data,
    };
  }

  /**
   * Completes the `headless=true` secondary selection step and binds the chosen entity
   * to the tenant's Zernio Profile.
   * Ref: zernio.txt lines 14871-14933
   */
  public static async completeHeadlessSelection(params: {
    organizationId: string;
    step: SecondarySelectionStep;
    entityId: string;
    tempToken: string;
    userProfile?: Record<string, unknown>;
    connectToken?: string;
    wabaId?: string;
    redirectUrl?: string;
    reconnectAccountId?: string;
  }) {
    if (params.step === 'select_public_profile') {
      throw new ZernioApiException({ status: 501, error: 'Snapchat profile selection is not implemented yet.' });
    }
    if (typeof params.tempToken !== 'string' || !params.tempToken.trim() || params.tempToken.startsWith('sim_') ||
        typeof params.entityId !== 'string' || !params.entityId.trim()) {
      throw new ZernioApiException({ status: 400, error: 'A valid authorization token and selected entity are required.' });
    }

    const endpointByStep: Record<
      SecondarySelectionStep,
      { path: string; idField: string }
    > = {
      select_page: { path: '/connect/facebook/select-page', idField: 'pageId' },
      select_organization: {
        path: '/connect/linkedin/select-organization',
        idField: 'organizationId',
      },
      select_board: {
        path: '/connect/pinterest/select-board',
        idField: 'boardId',
      },
      select_location: {
        path: '/connect/googlebusiness/select-location',
        idField: 'locationId',
      },
      select_public_profile: {
        path: '/connect/snapchat/select-profile',
        idField: 'profileId',
      },
      select_phone_number: {
        path: '/connect/whatsapp/select-phone-number',
        idField: 'phoneNumberId',
      },
      select_account: {
        path: '/connect/instagram/select-account',
        idField: 'pageId',
      },
    };

    const target = endpointByStep[params.step];
    if (!target) throw new ZernioApiException({ status: 400, error: 'Unsupported account selection step.' });
    if (params.step === 'select_phone_number' && !params.wabaId?.trim()) {
      throw new ZernioApiException({ status: 400, error: 'Select the WhatsApp Business Account associated with this number.' });
    }
    const profileId = await this.ensureTenantProfile(params.organizationId);

    const selectionPlatform = target.path.split('/')[2];
    if (params.reconnectAccountId) await verifyReconnectIdentity(params.organizationId, params.reconnectAccountId, selectionPlatform);
    else await reserveConnectionCapacity(params.organizationId, profileId, selectionPlatform, true);

    const { data } = await zernioClient.request<Record<string, unknown>>({
      method: 'POST',
      path: target.path,
      ...(params.connectToken ? { extraHeaders: { 'X-Connect-Token': params.connectToken } } : {}),
      body: {
        [target.idField]: params.entityId,
        profileId,
        tempToken: params.tempToken,
        ...(params.userProfile ? { userProfile: params.userProfile } : {}),
        ...(params.wabaId ? { wabaId: params.wabaId } : {}),
        ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
      },
    });

    return { simulated: false, ...data };
  }

  /**
   * Direct credential connections (100% white-label, no browser OAuth redirect):
   * - Bluesky (`POST /v1/connect/bluesky/credentials`)
   * - Self-hosted WordPress (`POST /v1/connect/wordpress/token`)
   * - Shopify Admin API Token (`POST /v1/connect/shopify/token`)
   * - WhatsApp System User Token (`POST /v1/connect/whatsapp/credentials`)
   * Ref: zernio.txt lines 15022-15112 & 45805-45875
   */
  public static async connectWithCredentials(params: {
    organizationId: string;
    platform: 'bluesky' | 'wordpress' | 'shopify' | 'whatsapp';
    credentials: Record<string, string>;
  }) {
    const policy = await assertSubServiceAllowed(
      params.organizationId,
      'core_connect'
    );
    if (!policy.allowedPlatforms.includes(params.platform)) {
      throw new Error(`Platform "${params.platform}" is disabled for this tenant.`);
    }

    const profileId = await this.ensureTenantProfile(params.organizationId);

    await reserveConnectionCapacity(params.organizationId, profileId, params.platform);

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        account: {
          accountId: `acc_cred_${params.platform}_${Date.now().toString(36)}`,
          platform: params.platform,
          profileId,
          isActive: true,
        },
      };
    }

    const pathMap = {
      bluesky: '/connect/bluesky/credentials',
      wordpress: '/connect/wordpress/token',
      shopify: '/connect/shopify/token',
      whatsapp: '/connect/whatsapp/credentials',
    } as const;

    // Only credential fields may cross this boundary; routing belongs to the server.
    const credentials = params.credentials;
    const credentialFields = {
      bluesky: {
        identifier: credentials.identifier || credentials.handle,
        appPassword: credentials.appPassword || credentials.password,
      },
      wordpress: {
        siteUrl: credentials.siteUrl,
        username: credentials.username,
        applicationPassword: credentials.applicationPassword,
      },
      shopify: {
        shop: credentials.shop || credentials.shopDomain,
        accessToken: credentials.accessToken || credentials.adminToken,
      },
      whatsapp: {
        accessToken: credentials.accessToken || credentials.systemUserToken,
        wabaId: credentials.wabaId,
        phoneNumberId: credentials.phoneNumberId,
        ...(credentials.pin ? { pin: credentials.pin } : {}),
      },
    };

    const { data } = await zernioClient.request({
      method: 'POST',
      path: pathMap[params.platform],
      body: {
        ...credentialFields[params.platform],
        profileId,
      },
    });

    return { simulated: false, ...data };
  }

  /**
   * Lists connected accounts and their health (`GET /v1/accounts` + `GET /v1/accounts/health`)
   * scoped strictly to the tenant's `profileId`.
   * Ref: zernio.txt lines 15369-15417 & 19527-19579
   */
  public static async listTenantAccountsWithHealth(organizationId: string) {
    const policy = await assertSubServiceAllowed(organizationId, 'core_connect');
    const profileId = await this.ensureTenantProfile(organizationId);

    const { data: inventory } = await zernioClient.request<{
      accounts?: Array<{ _id: string; profileId: string | { _id?: string }; platform: string; username?: string; displayName?: string; metadata?: { loginMethod?: string }; isActive: boolean; enabled?: boolean; needsReconnection?: boolean }>;
    }>({ method: 'GET', path: '/accounts', query: { profileId } });
    const { data: health } = await zernioClient.request<{
      accounts?: Array<{ accountId?: string; profileId?: string; status?: string; needsReconnect?: boolean; issues?: string[]; canPost?: boolean; canFetchAnalytics?: boolean; tokenExpiresAt?: string; tokenValid?: boolean; messagingRestriction?: unknown; analyticsSync?: unknown }>;
    }>({ method: 'GET', path: '/accounts/health', query: { profileId } });
    if (!Array.isArray(inventory.accounts) || !Array.isArray(health.accounts)) {
      throw new ZernioApiException({ status: 502, error: 'The provider did not return a valid account health inventory.' });
    }
    const checkedAt = new Date().toISOString();
    const accounts = inventory.accounts.filter((account) =>
      (typeof account.profileId === 'string' ? account.profileId : account.profileId?._id) === profileId
    ).map((account) => {
      const observed = health.accounts!.find((item) => item.accountId === account._id && item.profileId === profileId);
      const status = observed && ['healthy', 'warning', 'error'].includes(observed.status || '') ? observed.status! : 'unknown';
      return { _id: account._id, id: account._id, accountId: account._id, platform: account.platform,
        ...(account.platform === 'instagram' ? { loginMethod: account.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' as const : 'instagram_login' as const } : {}),
        isActive: account.isActive, enabled: account.enabled, needsReconnection: account.needsReconnection === true,
        username: account.username || '', displayName: account.displayName || account.username || '',
        status, needsReconnect: account.needsReconnection === true || observed?.needsReconnect === true || !account.isActive,
        issues: observed?.issues || [], canPost: observed?.canPost === true, canFetchAnalytics: observed?.canFetchAnalytics === true,
        tokenExpiresAt: observed?.tokenExpiresAt, tokenValid: observed?.tokenValid,
        messagingRestriction: observed?.messagingRestriction, analyticsSync: observed?.analyticsSync, checkedAt, syncTime: checkedAt };
    });
    return { simulated: false, profileId, checkedAt,
      quota: { used: accounts.length, max: policy.quotas.maxConnectedAccounts },
      summary: { total: accounts.length, healthy: accounts.filter((a) => a.status === 'healthy').length,
        warning: accounts.filter((a) => a.status === 'warning').length, error: accounts.filter((a) => a.status === 'error').length,
        unknown: accounts.filter((a) => a.status === 'unknown').length, needsReconnect: accounts.filter((a) => a.needsReconnect).length },
      accounts };
  }
}
