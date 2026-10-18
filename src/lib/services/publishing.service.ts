import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioClient, zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';
import type { SocialPlatform } from '@/types/platform';

export interface CreateTenantPostInput {
  organizationId: string;
  content: string;
  platforms: Array<{
    platform: SocialPlatform;
    accountId: string;
    platformSpecificData?: Record<string, unknown>;
  }>;
  mediaItems?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
  }>;
  scheduledFor?: string;
  timezone?: string;
  publishNow?: boolean;
  useProfileQueue?: boolean;
  queueId?: string;
  idempotencyKey?: string;
}

/**
 * SUB-SERVICE 2: OMNICHANNEL SOCIAL PUBLISHING, QUEUES & CUSTOM MEDIA CDN
 * - Publishes, schedules, or queues posts across all 16 platforms
 * - Enforces Super Admin platform & post quota restrictions
 * - Supports recurring per-customer Queue Slots (`/v1/queue/slots` & `queuedFromProfile`)
 * - Supports Custom Branded Media CDN via Supabase Storage (or Zernio presigned uploads)
 * - Supports Pre-Flight Validation, Bulk CSV Upload, LinkedIn @mentions, Reddit Search & X Engagement
 */
export class PublishingService {
  /**
   * Creates, schedules, or queues a post for a customer with full retry safety (`Idempotency-Key`).
   * Ref: zernio.txt lines 19654-19893
   */
  public static async createPost(input: CreateTenantPostInput) {
    const policy = await assertSubServiceAllowed(
      input.organizationId,
      'publishing'
    );

    // Ensure every target platform is allowed by Super Admin + Tenant Plan
    for (const target of input.platforms) {
      if (!policy.allowedPlatforms.includes(target.platform)) {
        throw new Error(
          `Platform "${target.platform}" is disabled by Super Admin or not included in plan "${policy.planKey}".`
        );
      }
    }

    const profileId = await CoreConnectService.ensureTenantProfile(
      input.organizationId
    );
    const idempotencyKey =
      input.idempotencyKey || ZernioClient.newIdempotencyKey('post');

    const body: Record<string, unknown> = {
      content: input.content,
      platforms: input.platforms,
      ...(input.mediaItems && input.mediaItems.length > 0
        ? { mediaItems: input.mediaItems }
        : {}),
    };

    if (input.useProfileQueue) {
      body.queuedFromProfile = profileId;
      if (input.queueId) {
        body.queueId = input.queueId;
      }
    } else if (input.scheduledFor) {
      body.scheduledFor = input.scheduledFor;
      body.timezone = input.timezone || 'UTC';
    } else if (input.publishNow) {
      body.publishNow = true;
    }

    if (!zernioClient.isConfigured()) {
      const simulatedPost = {
        _id: `post_${Date.now().toString(36)}`,
        content: input.content,
        status: input.publishNow
          ? 'published'
          : input.scheduledFor || input.useProfileQueue
          ? 'scheduled'
          : 'draft',
        scheduledFor:
          input.scheduledFor ||
          (input.useProfileQueue ? '2026-10-19T14:00:00Z' : undefined),
        queuedFromProfile: input.useProfileQueue ? profileId : undefined,
        platforms: input.platforms.map((p) => ({
          platform: p.platform,
          accountId: p.accountId,
          status: input.publishNow ? 'published' : 'pending',
          platformPostUrl: input.publishNow
            ? `https://${p.platform}.com/p/sim_${Date.now().toString(36)}`
            : undefined,
        })),
      };

      WorkspaceStore.addPost(input.organizationId, {
        id: simulatedPost._id,
        content: simulatedPost.content,
        platforms: simulatedPost.platforms,
        status: simulatedPost.status,
        scheduledFor: simulatedPost.scheduledFor,
        publishNow: input.publishNow,
        createdAt: new Date().toISOString(),
      });

      return {
        simulated: true,
        idempotencyKey,
        post: simulatedPost,
      };
    }

    const { data, status } = await zernioClient.request<{
      message: string;
      post: Record<string, unknown>;
    }>({
      method: 'POST',
      path: '/posts',
      idempotencyKey,
      body,
    });

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from('posts').upsert({
        organization_id: input.organizationId,
        zernio_post_id: String(data.post._id || ''),
        idempotency_key: idempotencyKey,
        content: input.content,
        media_items: input.mediaItems || [],
        platforms: data.post.platforms || input.platforms,
        status: String(data.post.status || 'scheduled'),
        scheduled_for: (data.post.scheduledFor as string) || null,
        timezone: input.timezone || 'UTC',
        queued_from_profile: Boolean(input.useProfileQueue),
        zernio_queue_id: input.queueId || null,
      });
    }

    return {
      simulated: false,
      httpStatus: status, // Note: 207 indicates partial success across platforms (zernio.txt line 15307)
      idempotencyKey,
      post: data.post,
    };
  }

  /**
   * Configures recurring posting queue slots for a customer's profile (`POST /v1/queue/slots`).
   * Ref: zernio.txt lines 17195-17437
   */
  public static async upsertProfileQueue(params: {
    organizationId: string;
    name: string;
    timezone: string;
    slots: Array<{ dayOfWeek: number; time: string }>;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'publishing');
    const profileId = await CoreConnectService.ensureTenantProfile(
      params.organizationId
    );

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        schedule: {
          _id: `queue_${Date.now().toString(36)}`,
          profileId,
          name: params.name,
          timezone: params.timezone,
          slots: params.slots,
          active: true,
          isDefault: true,
        },
        nextSlots: ['2026-10-19T09:00:00-04:00', '2026-10-21T09:00:00-04:00'],
      };
    }

    const { data } = await zernioClient.request({
      method: 'POST',
      path: '/queue/slots',
      body: {
        profileId,
        name: params.name,
        timezone: params.timezone,
        slots: params.slots,
      },
    });

    return { simulated: false, ...data };
  }

  /**
   * Generates a white-labeled Supabase Storage upload URL (preferred so `media.zernio.com` is hidden)
   * or falls back to Zernio's `POST /v1/media/presign`.
   * Ref: zernio.txt lines 19662-19733
   */
  public static async createMediaPresignedUpload(params: {
    organizationId: string;
    filename: string;
    contentType: string;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'publishing');
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const storagePath = `${params.organizationId}/${Date.now()}_${params.filename}`;
      const { data: signed, error } = await supabase.storage
        .from('tenant-media')
        .createSignedUploadUrl(storagePath);

      if (!error && signed) {
        const { data: pub } = supabase.storage
          .from('tenant-media')
          .getPublicUrl(storagePath);
        return {
          provider: 'supabase-white-label-cdn',
          uploadUrl: signed.signedUrl,
          publicUrl: pub.publicUrl,
          expiresIn: 3600,
        };
      }
    }

    if (!zernioClient.isConfigured()) {
      return {
        provider: 'simulated-cdn',
        uploadUrl: `https://cdn.your-startup.com/upload/${params.filename}`,
        publicUrl: `https://cdn.your-startup.com/media/${params.organizationId}/${params.filename}`,
        expiresIn: 3600,
      };
    }

    const { data } = await zernioClient.request<{
      uploadUrl: string;
      publicUrl: string;
      expiresIn: number;
    }>({
      method: 'POST',
      path: '/media/presign',
      body: {
        filename: params.filename,
        contentType: params.contentType,
      },
    });

    return {
      provider: 'zernio-presign',
      ...data,
    };
  }

  /**
   * Lists posts for tenant workspace
   */
  public static async listPosts(organizationId: string) {
    const ws = WorkspaceStore.getWorkspace(organizationId);
    return ws.posts || [];
  }
}
