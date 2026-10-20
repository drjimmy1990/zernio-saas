import { NextResponse } from 'next/server';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { PublishingService } from '@/lib/services/publishing.service';
import { ZernioApiException, zernioClient } from '@/lib/zernio/client';
import { requireTenantSession, requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { startOAuthSession, acceptOAuthCallback, listOAuthResources, completeOAuthSelection } from '@/lib/auth/oauth-session';
import { disconnectAccount } from '@/lib/accounts/lifecycle';
import { getOwnedPhoneNumberForWhatsApp } from '@/lib/telephony/phone-numbers';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import type {
  OAuthScopeArea,
  SocialPlatform,
} from '@/types/platform';

/**
 * HEADLESS OAUTH, CREDENTIAL CONNECTION & TEST POST ENDPOINT (`/api/connect`)
 *
 * Supports:
 * 1. `start_oauth`: Creates a durable authorization session and starts provider signup.
 * 2. `accept_oauth_callback`: Verifies session binding and stores encrypted selection context.
 * 3. `list_entities` / `select_entity`: Use the stored session to select a verified resource.
 * 4. `connect_credentials`: Connects supported credential platforms through the provider.
 * 5. `test_post`: Publishes a test post and reports the provider status; messaging is unsupported.
 * 6. `action = "check_health"`: Returns live token health telemetry.
 * 7. `action = "disconnect"`: Safely disconnects or unbinds an account.
 */
export async function POST(request: Request) {
  try {
    requireTenantSession(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    const action = body.action as string;
    const { session, role } = await requireTenantAccess(request, body.organizationId);
    const organizationId = session.tenant.organizationId;
    if (action !== 'check_health') requireWorkspaceRole(role, action === 'test_post');
    const platform = (body.platform as string) || '';

    if (!zernioClient.isConfigured()) {
      throw new ZernioApiException({ status: 503, error: 'Zernio is not configured. Account connections are unavailable.' });
    }
    if (typeof body.tempToken === 'string' && body.tempToken.startsWith('sim_')) {
      throw new TenantAccessError(400, 'Restart the connection to obtain a valid authorization session.');
    }
    if (action === 'connect_credentials' && !['bluesky', 'wordpress', 'shopify', 'whatsapp'].includes(platform)) {
      throw new TenantAccessError(501, 'This credential connection is not implemented yet.');
    }
    if (action === 'start_oauth') {
      const callback = new URL(body.redirectUrl || '/dashboard?oauth_callback=1', process.env.NEXT_PUBLIC_APP_URL || request.url);
      const appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
      if (callback.origin !== appOrigin || callback.username || callback.password) {
        throw new TenantAccessError(400, 'The connection callback must return to this application.');
      }
    }

    // =========================================================================
    // 1. START OAUTH
    // =========================================================================
    if (action === 'start_oauth') {
      let expectedPhoneNumber: string | undefined;
      if (body.purchasedNumberId != null) {
        if (platform !== 'whatsapp' || typeof body.purchasedNumberId !== 'string' || !body.purchasedNumberId.trim()) {
          throw new TenantAccessError(400, 'Select an owned phone number for WhatsApp.');
        }
        if (body.whatsappOnboarding && body.whatsappOnboarding !== 'api') throw new TenantAccessError(400, 'Purchased numbers require Cloud API onboarding.');
        const number = await getOwnedPhoneNumberForWhatsApp(organizationId, body.purchasedNumberId);
        expectedPhoneNumber = number.phoneNumber;
      }
      const result = await startOAuthSession(request, session, {
        platform: body.platform as SocialPlatform,
        requestedScopes: body.requestedScopes as OAuthScopeArea[] | undefined,
        shopDomain: body.shopDomain as string | undefined,
        loginMethod: body.loginMethod as 'instagram_login' | 'facebook_login' | undefined,
        whatsappOnboarding: expectedPhoneNumber ? 'api' : body.whatsappOnboarding as 'api' | 'business_app' | undefined,
        whatsappSignupMode: body.whatsappSignupMode as 'hosted' | 'headless' | undefined,
        reconnectAccountId: body.reconnectAccountId,
      }, expectedPhoneNumber, typeof body.purchasedNumberId === 'string' ? body.purchasedNumberId : undefined);

      return NextResponse.json({
        ...result,
        handshakeState: 'ready',
        permissions: [
          'Manage & publish posts, stories, reels and updates',
          'Read audience insights, reach and engagement metrics',
          'Access and reply to customer comments and direct messages',
          'Receive real-time webhooks for delivery status',
        ],
      });
    }

    if (action === 'accept_oauth_callback' || action === 'complete_oauth_callback') {
      return NextResponse.json(await acceptOAuthCallback(request, session, body));
    }
    if (action === 'list_entities') {
      return NextResponse.json(await listOAuthResources(request, session, body.oauthSessionId, platform));
    }
    if (action === 'select_entity') {
      return NextResponse.json(await completeOAuthSelection(request, session, body));
    }

    // =========================================================================
    // 4. CONNECT WITH CREDENTIALS (Telegram, Shopify, WordPress, Bluesky, WhatsApp)
    // =========================================================================
    if (action === 'connect_credentials') {
      const creds = (body.credentials as Record<string, string>) || {};

      // Handle Telegram Bot Token specifically
      if (platform === 'telegram') {
        const botToken = creds.botToken || creds.token || creds.secretOrToken || '';
        if (!botToken || botToken.trim().length < 8) {
          return NextResponse.json(
            { error: 'Valid Telegram Bot Token is required (e.g. 123456789:ABCdefGh...)' },
            { status: 400 }
          );
        }

        const accountId = `acc_telegram_${Date.now().toString(36)}`;
        const tgAccount = {
          id: accountId,
          accountId,
          platform: 'telegram',
          username: creds.username || '@TelegramBot',
          displayName: creds.displayName || 'Telegram Bot Channel',
          status: 'healthy',
          tokenHealth: {
            status: 'healthy',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            expiresInDays: 365,
          },
          syncTime: 'Just now',
          grantedScopes: ['messaging', 'broadcast', 'webhooks'],
          canPost: true,
          canFetchAnalytics: true,
          needsReconnect: false,
        };

        WorkspaceStore.addConnectedAccount(organizationId, tgAccount);

        return NextResponse.json({
          success: true,
          simulated: !zernioClient.isConfigured(),
          account: tgAccount,
        });
      }

      // Handle Bluesky, WordPress, Shopify, WhatsApp
      if (['bluesky', 'wordpress', 'shopify', 'whatsapp'].includes(platform)) {
        if (platform === 'whatsapp') {
          if (!creds.wabaId?.trim() || !creds.phoneNumberId?.trim() || !creds.accessToken?.trim()) {
            return NextResponse.json(
              { error: 'WhatsApp Business Account ID (wabaId), Phone Number ID (phoneNumberId), and System User Access Token (accessToken) are all required.' },
              { status: 400 }
            );
          }
        }

        let remoteAccountId = '';
        let isSimulated = true;

        if (zernioClient.isConfigured()) {
          const result = await CoreConnectService.connectWithCredentials({
            organizationId,
            platform: platform as 'bluesky' | 'wordpress' | 'shopify' | 'whatsapp',
            credentials: creds,
          });
          const remoteAcc = (result as { account?: Record<string, unknown> }).account;
          if (remoteAcc && (remoteAcc._id || remoteAcc.accountId)) {
            remoteAccountId = String(remoteAcc._id || remoteAcc.accountId);
          }
          if (!remoteAccountId) throw new ZernioApiException({ status: 502, error: 'Zernio did not confirm a connected account.' });
          isSimulated = false;
        }

        const [verifiedAccount] = await requireTenantAccounts(organizationId, [remoteAccountId]);

        let username = `@${platform}`;
        let displayName = `${platform.toUpperCase()} Account`;

        if (platform === 'shopify') {
          username = creds.shopDomain || creds.identifier || 'store.myshopify.com';
          displayName = creds.displayName || `Shopify (${username})`;
        } else if (platform === 'wordpress') {
          username = creds.siteUrl || creds.identifier || 'wordpress-site';
          displayName = creds.displayName || `WordPress (${username})`;
        } else if (platform === 'bluesky') {
          username = creds.handle || creds.identifier || 'bsky.social';
          displayName = creds.displayName || `Bluesky (${username})`;
        } else if (platform === 'whatsapp') {
          const phoneId = creds.phoneNumberId || creds.identifier;
          const wabaId = creds.wabaId;
          username = creds.phoneNumber || `Phone ID: ${phoneId}`;
          displayName = creds.displayName || `WhatsApp Business (WABA: ${wabaId})`;
        }

        const credAccount = {
          id: remoteAccountId,
          accountId: remoteAccountId,
          platform: verifiedAccount.platform,
          username: verifiedAccount.username || username,
          displayName: verifiedAccount.displayName || displayName,
          status: verifiedAccount.isActive && !verifiedAccount.needsReconnection ? 'active' : 'disconnected',
          syncTime: 'Just now',
          needsReconnect: Boolean(verifiedAccount.needsReconnection),
        };

        WorkspaceStore.addConnectedAccount(organizationId, credAccount);

        return NextResponse.json({
          success: true,
          simulated: isSimulated,
          account: credAccount,
        });
      }

      // Fallback for any other credential connection
      const accountId = `acc_${platform}_${Date.now().toString(36)}`;
      const fallbackAccount = {
        id: accountId,
        accountId,
        platform,
        username: creds.identifier || `@asra3_${platform}`,
        displayName: `Asra3 ${platform.toUpperCase()}`,
        status: 'healthy',
        tokenHealth: {
          status: 'healthy',
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          expiresInDays: 60,
        },
        syncTime: 'Just now',
        grantedScopes: ['posting', 'analytics'],
        canPost: true,
        canFetchAnalytics: true,
        needsReconnect: false,
      };

      WorkspaceStore.addConnectedAccount(organizationId, fallbackAccount);

      return NextResponse.json({
        success: true,
        simulated: true,
        account: fallbackAccount,
      });
    }

    // =========================================================================
    // 5. TEST POST / TEST MESSAGE VERIFICATION
    // =========================================================================
    if (action === 'test_post') {
      const [account] = await requireTenantAccounts(organizationId, [body.accountId]);
      if (account.platform !== platform) throw new TenantAccessError(400, 'The platform does not match the connected account.');
      if (!account.isActive || account.needsReconnection) throw new TenantAccessError(409, 'Reconnect this account before publishing.');
      const content =
        (body.content as string) ||
        'Asra3 Omnichannel Connection Verified: Broadcast pipeline operational. 🚀';
      const isMessaging = ['telegram', 'whatsapp', 'discord', 'slack'].includes(platform);
      if (isMessaging) {
        throw new TenantAccessError(501, 'Message verification requires a recipient and a supported messaging flow. This connection test does not send messages.');
      }
      const postResult = await PublishingService.createPost({
        organizationId,
        content,
        publishNow: true,
        idempotencyKey: request.headers.get('idempotency-key') || body.idempotencyKey,
        platforms: [{ platform: account.platform as SocialPlatform, accountId: account._id }],
      });
      const post = postResult.post as Record<string, unknown> | undefined;
      if (postResult.simulated || typeof post?._id !== 'string' || typeof post.status !== 'string') {
        throw new ZernioApiException({ status: 502, error: 'The provider did not return a verifiable post result.' });
      }
      const targets = Array.isArray(post.platforms) ? post.platforms as Array<Record<string, unknown>> : [];
      const target = targets.find((item) => (typeof item.accountId === 'string' ? item.accountId : (item.accountId as { _id?: string })?._id) === account._id);
      const status = typeof target?.status === 'string' ? target.status : post.status;
      const failed = ['failed', 'partial'].includes(post.status) || ['failed', 'partial'].includes(status) || postResult.httpStatus === 207;
      const published = !failed && post.status === 'published' && status === 'published';
      return NextResponse.json({
        ...postResult,
        success: published,
        action: 'test_post',
        platform,
        simulated: false,
        ...(failed ? { error: 'The provider could not fully publish this test post.' } : {}),
        deliveryReceipt: {
          status,
          receiptId: post._id,
          ...(typeof target?.platformPostUrl === 'string' ? { platformPostUrl: target.platformPostUrl } : {}),
          message: published ? 'The provider confirmed publication.' : `Provider post status: ${status}. Publication is not confirmed.`,
        },
      }, { status: postResult.httpStatus || 200 });
    }

    // =========================================================================
    // 6. HEALTH CHECK
    // =========================================================================
    if (action === 'check_health') {
      const result = await CoreConnectService.listTenantAccountsWithHealth(organizationId);
      return NextResponse.json(result);
    }

    // =========================================================================
    // 7. DISCONNECT
    // =========================================================================
    if (action === 'disconnect') {
      const accountId = (body.accountId as string) || (body.id as string) || '';
      return NextResponse.json(await disconnectAccount(organizationId, accountId));
    }

    return NextResponse.json(
      { error: `Unknown connect action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connect error';
    const status = err instanceof TenantAccessError ? err.status : err instanceof ZernioApiException ? err.envelope.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
