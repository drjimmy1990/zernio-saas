import pLimit from 'p-limit';
import { ReportsService } from '@/lib/reports/service';

/**
 * Compatibility adapter for provider-backed social reports.
 * Missing metrics stay unavailable; source timestamps come from Zernio.
 */
export class AnalyticsService {
  /**
   * Fetches the current provider dashboard summary for a customer.
   * Ref: zernio.txt lines 18674-18767
   */
  public static async getCustomerDashboard(params: {
    organizationId: string;
    fromDate: string;
    toDate: string;
    platform?: string;
    forceRefresh?: boolean;
  }) {
    return ReportsService.social(params);
  }

  /**
   * Optional multi-tenant report check with a concurrency cap of five.
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
    const fromDate = new Date(Date.now() - (windowDays - 1) * 86_400_000)
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
