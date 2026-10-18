import pLimit from 'p-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';

/**
 * SUB-SERVICE 4: ANALYTICS & BUSINESS INTELLIGENCE ENGINE
 * - Serves customer dashboards from Supabase PostgreSQL cache (never hits Zernio live on page load)
 * - 1-Call Executive Summary (`GET /v1/analytics/dashboard` with `compare=previous_period`)
 * - Dual Attribution Daily Charts (`attribution=publish` vs `attribution=received`)
 * - 3-Window Background Sync Worker (`p-limit(5)` concurrency) for Hot (30d hourly),
 *   Long-Tail (366d weekly), and Onboarding Backfill
 * Ref: zernio.txt lines 18444-18895
 */
export class AnalyticsService {
  /**
   * Fetches (or syncs) the single-call executive dashboard summary for a customer.
   * Ref: zernio.txt lines 18674-18767
   */
  public static async getCustomerDashboard(params: {
    organizationId: string;
    fromDate: string;
    toDate: string;
    platform?: string;
    forceRefresh?: boolean;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'analytics');
    const profileId = await CoreConnectService.ensureTenantProfile(
      params.organizationId
    );

    const supabase = createSupabaseAdminClient();
    const platformKey = params.platform || 'all';

    if (supabase && !params.forceRefresh) {
      const { data: cached } = await supabase
        .from('analytics_dashboard_cache')
        .select('*')
        .eq('organization_id', params.organizationId)
        .eq('from_date', params.fromDate)
        .eq('to_date', params.toDate)
        .eq('platform', platformKey)
        .maybeSingle();

      if (cached) {
        return {
          source: 'supabase-cache',
          profileId,
          dateRange: { fromDate: params.fromDate, toDate: params.toDate },
          totals: cached.totals,
          previousTotals: cached.previous_totals,
          followers: cached.followers,
          daily: cached.daily_series,
          topPosts: cached.top_posts,
          dataAsOf: cached.data_as_of,
        };
      }
    }

    const workspace = WorkspaceStore.getWorkspace(params.organizationId);
    const hasAccounts = workspace.connectedAccounts && workspace.connectedAccounts.length > 0;

    if (!hasAccounts) {
      return {
        source: 'clean-tenant',
        profileId,
        dateRange: { fromDate: params.fromDate, toDate: params.toDate },
        totals: {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          clicks: 0,
          views: 0,
          engagementRate: 0,
        },
        previousTotals: {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          clicks: 0,
          views: 0,
          engagementRate: 0,
        },
        followers: {
          current: 0,
          gained: 0,
          byAccount: [],
        },
        daily: [],
        topPosts: [],
        dataAsOf: new Date().toISOString(),
      };
    }

    if (!zernioClient.isConfigured()) {
      return {
        source: 'simulated-sync-cache',
        profileId,
        dateRange: { fromDate: params.fromDate, toDate: params.toDate },
        totals: {
          impressions: 148200,
          reach: 112400,
          likes: 9420,
          comments: 1280,
          shares: 840,
          saves: 1590,
          clicks: 3410,
          views: 89300,
          engagementRate: 8.86,
        },
        previousTotals: {
          impressions: 121500,
          reach: 94100,
          likes: 7610,
          comments: 990,
          shares: 620,
          saves: 1180,
          clicks: 2780,
          views: 71200,
          engagementRate: 8.56,
        },
        followers: {
          current: 48920,
          gained: 1840,
          byAccount: [
            { platform: 'instagram', current: 28400, gained: 1120 },
            { platform: 'linkedin', current: 12120, gained: 410 },
            { platform: 'tiktok', current: 8400, gained: 310 },
          ],
        },
        daily: [
          { date: '2026-10-12', impressions: 21400, reach: 16200, engagement: 1890, views: 12800, followersGained: 280 },
          { date: '2026-10-13', impressions: 24900, reach: 19100, engagement: 2210, views: 15400, followersGained: 340 },
          { date: '2026-10-14', impressions: 28100, reach: 21800, engagement: 2640, views: 18200, followersGained: 410 },
          { date: '2026-10-15', impressions: 23800, reach: 18400, engagement: 2050, views: 14100, followersGained: 260 },
          { date: '2026-10-16', impressions: 26200, reach: 20100, engagement: 2310, views: 15900, followersGained: 310 },
          { date: '2026-10-17', impressions: 23800, reach: 16800, engagement: 2030, views: 12900, followersGained: 240 },
        ],
        topPosts: [
          {
            postId: '65f1c0a9e2b4d5f6a7b8c9d0',
            platform: 'instagram',
            publishedAt: '2026-10-14T15:00:00.000Z',
            metrics: { impressions: 38400, reach: 31200, likes: 2840, comments: 342, shares: 198, saves: 410, engagementRate: 9.87 },
          },
          {
            postId: '65f1c0a9e2b4d5f6a7b8c9d1',
            platform: 'linkedin',
            publishedAt: '2026-10-13T13:00:00.000Z',
            metrics: { impressions: 22900, reach: 18100, likes: 1420, comments: 218, shares: 145, saves: 190, engagementRate: 8.61 },
          },
        ],
        dataAsOf: new Date().toISOString(),
      };
    }

    const { data } = await zernioClient.request<{
      dateRange: { fromDate: string; toDate: string };
      totals: Record<string, number>;
      previousTotals?: Record<string, number>;
      followers: Record<string, unknown>;
      daily: Array<Record<string, unknown>>;
      topPosts: Array<Record<string, unknown>>;
      dataAsOf: string;
    }>({
      method: 'GET',
      path: '/analytics/dashboard',
      query: {
        profileId,
        fromDate: params.fromDate,
        toDate: params.toDate,
        compare: 'previous_period',
        ...(params.platform && params.platform !== 'all'
          ? { platform: params.platform }
          : {}),
      },
    });

    if (supabase) {
      await supabase.from('analytics_dashboard_cache').upsert(
        {
          organization_id: params.organizationId,
          from_date: params.fromDate,
          to_date: params.toDate,
          platform: platformKey,
          totals: data.totals,
          previous_totals: data.previousTotals || {},
          followers: data.followers,
          daily_series: data.daily,
          top_posts: data.topPosts,
          data_as_of: data.dataAsOf || new Date().toISOString(),
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,from_date,to_date,platform' }
      );
    }

    return {
      source: 'zernio-live-sync',
      profileId,
      ...data,
    };
  }

  /**
   * Multi-tenant background sync worker with `p-limit(5)` concurrency cap.
   * - Window = 30 days for hourly hot sync
   * - Window = 366 days for weekly long-tail sync
   * Ref: zernio.txt lines 18562-18670
   */
  public static async syncAllTenantsWindow(
    organizationIds: string[],
    windowDays: 30 | 366
  ) {
    const limit = pLimit(5);
    const toDate = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - windowDays * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const results = await Promise.allSettled(
      organizationIds.map((orgId) =>
        limit(() =>
          this.getCustomerDashboard({
            organizationId: orgId,
            fromDate,
            toDate,
            forceRefresh: true,
          })
        )
      )
    );

    return {
      windowDays,
      fromDate,
      toDate,
      syncedCount: results.filter((r) => r.status === 'fulfilled').length,
      failedCount: results.filter((r) => r.status === 'rejected').length,
    };
  }
}
