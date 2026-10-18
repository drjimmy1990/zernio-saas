import { zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { WorkspaceStore } from '@/lib/storage/workspace-store';

/**
 * SUB-SERVICE 7: E-COMMERCE, BLOGS & LOCAL BUSINESS SUITE
 * - Unified Commerce API (`/v1/commerce/*`) over Shopify & WooCommerce (Products, Variants,
 *   Multi-Location Inventory, Collections, Discounts/Coupons, Channels, Markets, Metafields,
 *   Store Pages, Menus & Meta Commerce Catalog Sync)
 * - Multi-Platform Blogs (`/v1/blogs/*`) for Shopify Blogs, WordPress.com & Self-Hosted WordPress
 * - Google Business Profile Local SEO Suite (`/v1/google-business/*`) for Multi-Location Posting,
 *   Events & Offers, Services & Food Menus, and Location Verification
 * Ref: zernio.txt lines 73-88, 14296-14450 & 28167-30140
 */
export class CommerceLocalService {
  /**
   * Reads a connected Shopify or WooCommerce store's capabilities and products.
   * Ref: zernio.txt lines 14323-14450
   */
  public static async getCommerceStoreOverview(params: {
    organizationId: string;
    accountId: string;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'commerce_local');

    const workspace = WorkspaceStore.getWorkspace(params.organizationId);
    const storeAccount = workspace.connectedAccounts.find(
      (a) => a.platform === 'shopify' || a.platform === 'wordpress'
    );

    if (!storeAccount) {
      return {
        simulated: false,
        store: null,
        featuredProducts: [],
        blogs: [],
        googleBusinessLocations: [],
      };
    }

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        store: {
          accountId: storeAccount.accountId,
          platform: storeAccount.platform,
          name: storeAccount.displayName || 'Connected Store',
          domain: `${storeAccount.username || 'store'}.myshopify.com`,
          url: `https://${storeAccount.username || 'store'}.myshopify.com`,
          currency: 'USD',
          country: 'US',
          capabilities: [
            'products.read',
            'products.create',
            'inventory.read',
            'collections.read',
          ],
          missingCapabilities: [],
          grantPermissionsUrl: null,
        },
        featuredProducts: [],
        blogs: [],
        googleBusinessLocations: [],
      };
    }

    try {
      const [{ data: storeData }, { data: productsData }] = await Promise.all([
        zernioClient.request({
          method: 'GET',
          path: '/commerce/store',
          query: { accountId: storeAccount.accountId || params.accountId },
        }),
        zernioClient.request({
          method: 'GET',
          path: '/commerce/products',
          query: { accountId: storeAccount.accountId || params.accountId, limit: 10 },
        }),
      ]);

      return {
        simulated: false,
        ...storeData,
        ...productsData,
      };
    } catch {
      return {
        simulated: true,
        store: {
          accountId: storeAccount.accountId,
          platform: storeAccount.platform,
          name: storeAccount.displayName || 'Connected Store',
          domain: `${storeAccount.username || 'store'}.myshopify.com`,
          url: `https://${storeAccount.username || 'store'}.myshopify.com`,
          currency: 'USD',
          country: 'US',
          capabilities: ['products.read', 'products.create'],
          missingCapabilities: [],
          grantPermissionsUrl: null,
        },
        featuredProducts: [],
        blogs: [],
        googleBusinessLocations: [],
      };
    }
  }
}
