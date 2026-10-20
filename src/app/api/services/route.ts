import { NextResponse } from 'next/server';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { PublishingService } from '@/lib/services/publishing.service';
import { InboxCrmService } from '@/lib/services/inbox-crm.service';
import { runInboxReply } from '@/lib/inbox/actions';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { AdsService } from '@/lib/services/ads.service';
import { TelephonyService } from '@/lib/services/telephony.service';
import { SupportAiService } from '@/lib/services/support-ai.service';
import {
  getFallbackStore,
  resolveEffectiveTenantPolicy,
} from '@/lib/zernio/policy-engine';
import { requireTenantSession, requireTenantAccess, requireWorkspaceRole, canManageWorkspace, TenantAccessError } from '@/lib/auth/tenant-access';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { ZernioApiException } from '@/lib/zernio/client';
import type { AdPlatform } from '@/types/platform';
import { disconnectAccount } from '@/lib/accounts/lifecycle';
import { SaasApiKeyService } from '@/lib/saas/api-keys';
import { runPhoneLifecycleAction } from '@/lib/phone-lifecycle/actions';
import { unavailableServiceAction } from '@/lib/launch/availability';

/**
 * UNIFIED SUB-SERVICES API GATEWAY (`/api/services`)
 * Enforces the Super Admin Policy Engine on every request and dispatches to the
 * 8 modular sub-services (`core_connect`, `publishing`, `inbox_crm`, `analytics`,
 * `ads`, `telephony`, `commerce_local`, `support_ai`).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { session, role } = await requireTenantAccess(request, searchParams.get('organizationId'));
    const organizationId = session.tenant.organizationId;

    const policy = await resolveEffectiveTenantPolicy(organizationId);
    const availableTenants = Object.values(getFallbackStore().tenants)
      .filter((tenant) => tenant.organizationId === organizationId).map(
      (t) => ({
        organizationId: t.organizationId,
        organizationName: t.organizationName,
        planKey: t.planKey,
        status: t.status,
        zernioProfileId: t.zernioProfileId,
        companyName: t.whiteLabelBranding.companyName,
      })
    );


    const [accountsHealth, conversations, analytics, ads, telephony, commerce, posts] =
      await Promise.all([
        policy.enabledSubServices.includes('core_connect')
          ? CoreConnectService.listTenantAccountsWithHealth(organizationId).catch(() => ({
              simulated: false, unavailable: true,
              error: 'Account state could not be refreshed from the provider.',
              accounts: [],
            }))
          : null,
        policy.enabledSubServices.includes('inbox_crm')
          ? InboxCrmService.listConversations({ organizationId }).catch(() => ({
              simulated: false,
              unavailable: true,
              error: 'Inbox state could not be refreshed from the provider.',
              data: [],
              pagination: { hasMore: false, nextCursor: null },
              meta: { accountsQueried: 0, accountsFailed: 0, failedAccounts: [] },
            }))
          : null,
        policy.enabledSubServices.includes('analytics')
          ? AnalyticsService.getCustomerDashboard({ organizationId,
              fromDate: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
              toDate: new Date().toISOString().slice(0, 10), platform: 'facebook',
            }).catch(() => ({ source: 'unavailable', unavailable: true, totals: null, previousTotals: null,
              followers: null, daily: [], topPosts: [], dataAsOf: null }))
          : null,
        null, // Advertising is outside the selected release.
        policy.enabledSubServices.includes('telephony')
          ? runPhoneLifecycleAction(organizationId, 'numbers', {}).catch(() => ({
              simulated: false,
              unavailable: true,
              error: 'Phone number status could not be verified. Refresh before continuing.',
              numbers: [],
              ownedNumbers: [],
              callHistory: null,
              threads: null,
            }))
          : null,
        null, // Commerce is outside the selected release.
        policy.enabledSubServices.includes('publishing')
          ? PublishingService.listPosts(organizationId).then(posts => ({ posts })).catch(() => ({ posts: [], unavailable: true, error: 'Posts could not be refreshed from the provider.' }))
          : { posts: [] },
      ]);

    return NextResponse.json({
      policy,
      availableTenants,
      subServicesData: {
        core_connect: accountsHealth,
        publishing: posts,
        inbox_crm: conversations,
        analytics,
        ads,
        telephony,
        commerce_local: commerce,
        developerHub: { apiKeys: [], webhooks: [], apiLogs: [], wallet: null,
          legacyTools: 'retired', customerPayments: 'coming_soon', settingsEndpoint: '/api/saas',
          canManage: canManageWorkspace(role) },
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load workspace';
    const status = err instanceof TenantAccessError ? err.status : err instanceof ZernioApiException ? err.envelope.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    requireTenantSession(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    const { session, role } = await requireTenantAccess(request, body.organizationId);
    const organizationId = session.tenant.organizationId;

    const subService = body.subService as string;
    const action = body.action as string;

    const unavailable = unavailableServiceAction(subService, action);
    if (unavailable) return NextResponse.json({ success: false, error: unavailable, code: 'feature_unavailable' }, { status: 501 });

    const readAction = subService === 'telephony' &&
      ['search_numbers', 'list_call_history', 'list_messages', 'list_numbers'].includes(action);
    if (!readAction) requireWorkspaceRole(role, ['publishing', 'inbox_crm'].includes(subService));

    // Account IDs are provider-wide. A valid session alone does not authorize them.
    const accountIds: unknown[] = [];
    if (body.accountId != null) accountIds.push(body.accountId);
    if (subService === 'core_connect' && action === 'disconnect_account' && body.accountId == null) accountIds.push(body.id);
    if (body.whatsappAccountId != null) accountIds.push(body.whatsappAccountId);
    if (Array.isArray(body.platforms)) accountIds.push(...body.platforms.map((target: { accountId?: unknown }) => target?.accountId));
    if (body.config?.accountId != null) accountIds.push(body.config.accountId);
    if (Array.isArray(body.config?.accountIds)) accountIds.push(...body.config.accountIds);
    if (action === 'send_reply' && !body.accountId) {
      throw new TenantAccessError(400, 'Select the conversation account.');
    }
    if (accountIds.length) await requireTenantAccounts(organizationId, accountIds);
    if (body.config?.profileId != null) {
      const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
      if (body.config.profileId !== profileId) throw new TenantAccessError(403, 'The profile does not belong to this workspace.');
    }

    if (subService === 'core_connect') {
      if (action === 'disconnect_account') {
        const accountId = (body.accountId as string) || (body.id as string) || '';
        return NextResponse.json(await disconnectAccount(organizationId, accountId));
      }
    }

    if (subService === 'publishing') {
      if (action === 'create_post') {
        const res = await PublishingService.createPost({
          organizationId,
          content: body.content,
          platforms: body.platforms,
          mediaItems: body.mediaItems,
          scheduledFor: body.scheduledFor,
          timezone: body.timezone,
          publishNow: body.publishNow,
          isDraft: body.isDraft,
          useProfileQueue: body.useProfileQueue,
          queueId: body.queueId,
          idempotencyKey: request.headers.get('idempotency-key') || body.idempotencyKey,
        });
        return NextResponse.json(res, { status: res.httpStatus || 200 });
      }
      if (action === 'create_queue') {
        const res = await PublishingService.upsertProfileQueue({
          organizationId,
          name: body.name,
          timezone: body.timezone,
          slots: body.slots,
        });
        return NextResponse.json(res);
      }
      if (action === 'presign_media') {
        const res = await PublishingService.createMediaPresignedUpload({
          organizationId,
          filename: body.filename,
          contentType: body.contentType,
          size: body.size,
        });
        return NextResponse.json(res);
      }
    }

    if (subService === 'inbox_crm') {
      if (action === 'send_reply') {
        const res = await runInboxReply(organizationId, {
          conversationId: body.conversationId,
          accountId: body.accountId,
          message: body.message,
          platform: body.platform,
          idempotencyKey: request.headers.get('idempotency-key') || body.idempotencyKey,
        });
        return NextResponse.json(res, { status: res.httpStatus });
      }
      if (action === 'create_automation') {
        const res = await InboxCrmService.createGrowthAutomation({
          organizationId,
          type: body.type,
          name: body.name,
          config: body.config || {},
        });
        return NextResponse.json(res);
      }
    }

    if (subService === 'ads') {
      if (action === 'connect_ad_account') {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const res = await AdsService.startAdsAccountConnect({
          organizationId,
          adPlatform: body.adPlatform as AdPlatform,
          redirectUrl: `${appUrl}/?ads_callback=1`,
          loginMode: body.loginMode || 'business',
          adAccountIds: body.adAccountIds,
        });
        return NextResponse.json(res);
      }
      if (action === 'send_capi_event') {
        const res = await AdsService.sendServerConversionEvent({
          organizationId,
          accountId: body.accountId,
          pixelOrDatasetId: body.pixelOrDatasetId,
          eventName: body.eventName,
          valueUsd: body.valueUsd,
          userDataHashed: body.userDataHashed || {},
        });
        return NextResponse.json(res);
      }
      if (action === 'create_campaign') {
        const res = await AdsService.createCampaign({
          organizationId,
          name: body.name,
          platform: body.platform,
          adPlatform: body.adPlatform,
          dailyBudgetUsd: body.dailyBudgetUsd,
          objective: body.objective,
        });
        return NextResponse.json(res);
      }
    }

    if (subService === 'telephony') {
      if (action === 'search_numbers') {
        const res = await TelephonyService.searchAvailableNumbers({
          organizationId,
          country: body.country,
          numberType: body.numberType,
          capabilities: body.capabilities,
          search: body.search,
          limit: body.limit,
        });
        return NextResponse.json(res);
      }
      if (action === 'buy_number') {
        const result = await runPhoneLifecycleAction(organizationId, 'purchase', body);
        return NextResponse.json(result, {status: result.httpStatus || 200});
      }
      if (action === 'link_whatsapp') {
        return NextResponse.json({
          error: 'Continue with Meta from WhatsApp setup to connect a verified, owned number.',
          code: 'hosted_onboarding_required',
        }, { status: 410 });
      }
      if (action === 'send_test_whatsapp') {
        const res = await TelephonyService.sendTestWhatsAppMessage({
          organizationId,
          phoneNumberId: body.phoneNumberId,
          accountId: body.accountId,
          recipientPhone: body.recipientPhone,
          templateName: body.templateName,
          templateLanguage: body.templateLanguage,
          parameters: body.parameters,
          customMessage: body.customMessage,
          idempotencyKey: request.headers.get('idempotency-key') || body.idempotencyKey,
        });
        return NextResponse.json(res, { status: res.httpStatus });
      }
      if (action === 'configure_ai_voice' || action === 'configure_voice_agent') {
        const res = await TelephonyService.configureAiVoiceAgent({
          organizationId,
          phoneNumberId: body.phoneNumberId,
          agentName: body.agentName,
          language: body.language,
          systemPrompt: body.systemPrompt,
          voicePersona: body.voicePersona,
          humanTransferNumber: body.humanTransferNumber,
          forwardTo: body.forwardTo,
          recordingEnabled: body.recordingEnabled ?? true,
          transcriptionEnabled: body.transcriptionEnabled ?? true,
        });
        return NextResponse.json(res);
      }
      if (action === 'initiate_call') {
        const res = await TelephonyService.initiateCall({
          organizationId,
          fromNumber: body.fromNumber,
          toNumber: body.toNumber,
          mode: body.mode || 'direct_voice',
          agentPrompt: body.agentPrompt,
          voicePersona: body.voicePersona,
          humanTransferNumber: body.humanTransferNumber,
          language: body.language,
        });
        return NextResponse.json(res);
      }
      if (action === 'list_call_history') {
        const res = await runPhoneLifecycleAction(organizationId, 'call_history', body);
        return NextResponse.json(res);
      }
      if (action === 'send_sms') {
        const res = await TelephonyService.sendSms({
          organizationId,
          fromNumber: body.fromNumber,
          toNumber: body.toNumber,
          text: body.text,
          mediaUrls: body.mediaUrls,
        });
        return NextResponse.json(res);
      }
      if (action === 'simulate_incoming_sms') {
        const res = await TelephonyService.simulateIncomingSms({
          organizationId,
          fromNumber: body.fromNumber,
          toNumber: body.toNumber,
          text: body.text,
          type: body.type,
        });
        return NextResponse.json(res);
      }
      if (action === 'list_messages') {
        const res = await runPhoneLifecycleAction(organizationId, 'messages', body);
        return NextResponse.json(res);
      }
      if (action === 'list_numbers') {
        const res = await runPhoneLifecycleAction(organizationId, 'numbers', body);
        return NextResponse.json(res);
      }
      if (action === 'create_kyc_link') {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const res = await TelephonyService.createWhiteLabelKycShareLink({
          organizationId,
          country: body.country || 'GB',
          redirectUrl: `${appUrl}/?kyc_completed=1`,
          language: body.language,
        });
        return NextResponse.json(res);
      }
      if (action === 'create_compliance_link') {
        const res = await TelephonyService.createWhiteLabelComplianceShareLink({
          organizationId,
          type: body.type,
          numberId: body.numberId,
        });
        return NextResponse.json(res);
      }
      if (action === 'mint_webrtc_session') {
        const res = await TelephonyService.createBrowserSoftphoneSession(
          organizationId
        );
        return NextResponse.json(res);
      }
      if (action === 'onboard_whatsapp_ai_agent') {
        const res = await TelephonyService.onboardMetaBusinessAgent({
          organizationId,
          whatsappAccountId: body.whatsappAccountId,
          faqs: body.faqs,
        });
        return NextResponse.json(res);
      }
    }

    if (subService === 'support_ai') {
      if (action === 'ask_diagnostic') {
        const res = await SupportAiService.askDiagnosticQuestion({
          organizationId,
          message: body.message,
          context: body.context || {},
          maxCostUsd: body.maxCostUsd,
        });
        return NextResponse.json(res);
      }
      if (action === 'create_api_key') {
        const result = await SaasApiKeyService.create({organizationId,actorId:session.user.id,name:body.name,scopes:body.scopes,expiresAt:body.expiresAt});
        return NextResponse.json({success:true,...result},{headers:{'Cache-Control':'no-store'}});
      }
      if (['revoke_api_key','delete_api_key'].includes(action)) {
        const revoked = await SaasApiKeyService.revoke({organizationId,actorId:session.user.id,keyId:body.keyId});
        return NextResponse.json({success:revoked,revoked},{headers:{'Cache-Control':'no-store'}});
      }
      if (action === 'roll_api_key') return NextResponse.json({error:'Create a new expiring key, update clients, then revoke the previous key.'},{status:501});
      if (['create_webhook','delete_webhook','test_webhook','topup_wallet'].includes(action)) {
        return NextResponse.json({success:false,error:'Customer webhook management and payment collection are coming soon. Incoming provider webhooks remain active.'},{status:501});
      }
    }

    return NextResponse.json(
      { error: `Unsupported subService/action: ${subService}/${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Sub-service action failed';
    const status = err instanceof TenantAccessError ? err.status : err instanceof ZernioApiException ? err.envelope.status : 400;
    return NextResponse.json({ error: message, ...(err instanceof ZernioApiException ? { code: err.envelope.code, details: err.envelope.details } : {}) }, { status });
  }
}
