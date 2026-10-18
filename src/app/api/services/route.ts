import { NextResponse } from 'next/server';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { PublishingService } from '@/lib/services/publishing.service';
import { InboxCrmService } from '@/lib/services/inbox-crm.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { AdsService } from '@/lib/services/ads.service';
import { TelephonyService } from '@/lib/services/telephony.service';
import { CommerceLocalService } from '@/lib/services/commerce-local.service';
import { SupportAiService } from '@/lib/services/support-ai.service';
import {
  getFallbackStore,
  resolveEffectiveTenantPolicy,
} from '@/lib/zernio/policy-engine';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import type { AdPlatform } from '@/types/platform';

/**
 * UNIFIED SUB-SERVICES API GATEWAY (`/api/services`)
 * Enforces the Super Admin Policy Engine on every request and dispatches to the
 * 8 modular sub-services (`core_connect`, `publishing`, `inbox_crm`, `analytics`,
 * `ads`, `telephony`, `commerce_local`, `support_ai`).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader
          .split(';')
          .map((c) => c.trim().split('='))
          .filter(([k]) => Boolean(k))
          .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
      );
      const session = decodeSession(cookies[SESSION_COOKIE_NAME]);
      organizationId = session?.tenant?.organizationId || 'default_tenant';
    }

    const policy = await resolveEffectiveTenantPolicy(organizationId);
    const availableTenants = Object.values(getFallbackStore().tenants).map(
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
          ? CoreConnectService.listTenantAccountsWithHealth(organizationId)
          : null,
        policy.enabledSubServices.includes('inbox_crm')
          ? InboxCrmService.listConversations({ organizationId })
          : null,
        policy.enabledSubServices.includes('analytics')
          ? AnalyticsService.getCustomerDashboard({
              organizationId,
              fromDate: '2026-10-01',
              toDate: '2026-10-17',
            })
          : null,
        policy.enabledSubServices.includes('ads')
          ? AdsService.listCampaigns(organizationId)
          : null,
        policy.enabledSubServices.includes('telephony')
          ? TelephonyService.listNumbersAndCapabilities(organizationId)
          : null,
        policy.enabledSubServices.includes('commerce_local')
          ? CommerceLocalService.getCommerceStoreOverview({
              organizationId,
              accountId: 'acc_shopify_01',
            })
          : null,
        policy.enabledSubServices.includes('publishing')
          ? PublishingService.listPosts(organizationId)
          : [],
      ]);

    const ws = WorkspaceStore.getWorkspace(organizationId);

    return NextResponse.json({
      policy,
      availableTenants,
      subServicesData: {
        core_connect: accountsHealth,
        publishing: { posts: posts || [] },
        inbox_crm: conversations,
        analytics,
        ads,
        telephony,
        commerce_local: commerce,
        developerHub: {
          apiKeys: ws.apiKeys || [],
          webhooks: ws.webhooks || [],
          apiLogs: ws.apiLogs || [],
          wallet: ws.wallet || {
            balanceUsd: 50.0,
            monthlySpentUsd: 0,
            currency: 'USD',
            transactions: [],
          },
        },
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load workspace';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let organizationId = body.organizationId as string;

    if (!organizationId) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader
          .split(';')
          .map((c) => c.trim().split('='))
          .filter(([k]) => Boolean(k))
          .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
      );
      const session = decodeSession(cookies[SESSION_COOKIE_NAME]);
      organizationId = session?.tenant?.organizationId || 'default_tenant';
    }

    const subService = body.subService as string;
    const action = body.action as string;

    if (subService === 'core_connect') {
      if (action === 'disconnect_account') {
        const accountId = (body.accountId as string) || (body.id as string) || '';
        if (accountId) {
          WorkspaceStore.removeConnectedAccount(organizationId, accountId);
        }
        return NextResponse.json({ success: true, accountId });
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
          useProfileQueue: body.useProfileQueue,
        });
        return NextResponse.json(res);
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
        });
        return NextResponse.json(res);
      }
    }

    if (subService === 'inbox_crm') {
      if (action === 'send_reply') {
        const res = await InboxCrmService.sendConversationReply({
          organizationId,
          conversationId: body.conversationId,
          accountId: body.accountId,
          message: body.message,
        });
        return NextResponse.json(res);
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
        const res = await TelephonyService.buyPhoneNumber({
          organizationId,
          country: body.country,
          phoneNumber: body.phoneNumber,
          numberType: body.numberType,
          locality: body.locality,
        });
        return NextResponse.json(res);
      }
      if (action === 'link_whatsapp') {
        const res = await TelephonyService.linkWhatsAppBusiness({
          organizationId,
          phoneNumberId: body.phoneNumberId,
          displayName: body.displayName,
          category: body.category,
          verificationMethod: body.verificationMethod,
        });
        return NextResponse.json(res);
      }
      if (action === 'send_test_whatsapp') {
        const res = await TelephonyService.sendTestWhatsAppMessage({
          organizationId,
          phoneNumberId: body.phoneNumberId,
          recipientPhone: body.recipientPhone,
          templateName: body.templateName,
          parameters: body.parameters,
          customMessage: body.customMessage,
        });
        return NextResponse.json(res);
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
        const res = await TelephonyService.listCallHistory({
          organizationId,
          limit: body.limit,
        });
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
        const res = await TelephonyService.listMessages({
          organizationId,
          channel: body.channel,
        });
        return NextResponse.json(res);
      }
      if (action === 'list_numbers') {
        const res = await TelephonyService.listNumbersAndCapabilities(
          organizationId
        );
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
        const keyItem = WorkspaceStore.createApiKey(organizationId, {
          name: body.name || 'Production API Key',
          environment: body.environment === 'test' ? 'test' : 'live',
          scopes: body.scopes,
        });
        return NextResponse.json({ success: true, apiKey: keyItem });
      }
      if (action === 'revoke_api_key') {
        const ws = WorkspaceStore.revokeApiKey(organizationId, body.keyId);
        return NextResponse.json({ success: true, apiKeys: ws.apiKeys });
      }
      if (action === 'delete_api_key') {
        const ws = WorkspaceStore.deleteApiKey(organizationId, body.keyId);
        return NextResponse.json({ success: true, apiKeys: ws.apiKeys });
      }
      if (action === 'roll_api_key') {
        const updated = WorkspaceStore.rollApiKey(organizationId, body.keyId);
        return NextResponse.json({ success: true, apiKey: updated });
      }
      if (action === 'create_webhook') {
        const wh = WorkspaceStore.createWebhook(organizationId, {
          url: body.url,
          description: body.description,
          events: body.events,
        });
        return NextResponse.json({ success: true, webhook: wh });
      }
      if (action === 'delete_webhook') {
        const ws = WorkspaceStore.deleteWebhook(organizationId, body.webhookId);
        return NextResponse.json({ success: true, webhooks: ws.webhooks });
      }
      if (action === 'test_webhook') {
        const deliveries = await WorkspaceStore.dispatchCustomerWebhook(
          organizationId,
          body.eventName || 'webhook.test',
          {
            message: 'Test webhook ping from Techurity Developer Hub',
            timestamp: new Date().toISOString(),
            sampleEvent: body.eventName || 'message.received',
          },
          body.webhookId
        );
        return NextResponse.json({ success: true, deliveries });
      }
      if (action === 'topup_wallet') {
        const amount = Number(body.amountUsd) || 25;
        const wallet = WorkspaceStore.adjustWalletBalance(
          organizationId,
          'credit',
          amount,
          body.description || `Developer Telecom & AI Credit Top-Up (+$${amount})`
        );
        return NextResponse.json({ success: true, wallet });
      }
    }

    return NextResponse.json(
      { error: `Unsupported subService/action: ${subService}/${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Sub-service action failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
