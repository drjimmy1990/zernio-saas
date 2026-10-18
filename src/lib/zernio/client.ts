import { randomUUID } from 'crypto';

export interface ZernioErrorEnvelope {
  status: number;
  error: string;
  type?:
    | 'invalid_request_error'
    | 'authentication_error'
    | 'permission_error'
    | 'not_found'
    | 'rate_limit_error'
    | 'platform_error'
    | 'api_error';
  code?: string;
  param?: string;
  details?: Record<string, unknown>;
  platform?: string;
  platformError?: Record<string, unknown>;
  retryAfterSeconds?: number;
  requestId?: string;
}

export class ZernioApiException extends Error {
  public readonly envelope: ZernioErrorEnvelope;

  constructor(envelope: ZernioErrorEnvelope) {
    super(envelope.error || `Zernio API error (${envelope.status})`);
    this.name = 'ZernioApiException';
    this.envelope = envelope;
  }
}

export interface ZernioRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  idempotencyKey?: string;
  xRequestId?: string;
  apiKeyOverride?: string; // Used when calling with a tenant's Scoped API Key (zrk_ / sk_)
  extraHeaders?: Record<string, string>;
}

/**
 * Production-grade Zernio HTTP & SDK client.
 * - Automatically attaches `Authorization: Bearer $ZERNIO_API_KEY` (or a tenant's scoped key)
 * - Supports `Idempotency-Key` and `x-request-id` headers for retry-safe mutations
 * - Parses Zernio's stable error envelope (`type`, `code`, `platformError`, `Retry-After`)
 * - Automatically retries transient 429s when Retry-After <= 15s
 */
export class ZernioClient {
  private readonly baseUrl: string;
  private readonly masterApiKey: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.baseUrl = (
      baseUrl ||
      process.env.ZERNIO_BASE_URL ||
      'https://zernio.com/api/v1'
    ).replace(/\/$/, '');
    this.masterApiKey = apiKey || process.env.ZERNIO_API_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(
      this.masterApiKey &&
        this.masterApiKey.startsWith('sk_') &&
        !this.masterApiKey.startsWith('sk_000000')
    );
  }

  public async request<T = Record<string, unknown>>(
    options: ZernioRequestOptions,
    attempt = 1
  ): Promise<{ data: T; status: number; requestId?: string; rateLimitRemaining?: number }> {
    const method = options.method ?? 'GET';
    const url = new URL(`${this.baseUrl}${options.path.startsWith('/') ? options.path : `/${options.path}`}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const token = options.apiKeyOverride || this.masterApiKey;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.extraHeaders || {}),
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
    if (options.xRequestId) {
      headers['x-request-id'] = options.xRequestId;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    const requestId = response.headers.get('X-Request-Id') || undefined;
    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    const rateLimitRemaining = remainingHeader ? Number(remainingHeader) : undefined;

    const rawText = await response.text();
    let parsed: Record<string, unknown> = {};
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        parsed = { error: rawText };
      }
    }

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterDetails =
        typeof (parsed.details as Record<string, unknown> | undefined)?.retryAfterSeconds === 'number'
          ? ((parsed.details as Record<string, unknown>).retryAfterSeconds as number)
          : undefined;
      const retryAfterSeconds = retryAfterHeader
        ? Number(retryAfterHeader)
        : retryAfterDetails;

      // Auto-retry rate limits when Retry-After is short (<= 15 seconds) and attempt < 3
      if (response.status === 429 && attempt < 3 && (retryAfterSeconds ?? 5) <= 15) {
        const waitMs = Math.max(1, retryAfterSeconds ?? 5) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this.request<T>(options, attempt + 1);
      }

      throw new ZernioApiException({
        status: response.status,
        error:
          (typeof parsed.error === 'string' && parsed.error) ||
          `Zernio API error (${response.status})`,
        type: parsed.type as ZernioErrorEnvelope['type'],
        code: typeof parsed.code === 'string' ? parsed.code : undefined,
        param: typeof parsed.param === 'string' ? parsed.param : undefined,
        details: parsed.details as Record<string, unknown> | undefined,
        platform: typeof parsed.platform === 'string' ? parsed.platform : undefined,
        platformError: parsed.platformError as Record<string, unknown> | undefined,
        retryAfterSeconds,
        requestId,
      });
    }

    return {
      data: parsed as T,
      status: response.status,
      requestId,
      rateLimitRemaining,
    };
  }

  public static newIdempotencyKey(prefix = 'idem'): string {
    return `${prefix}-${randomUUID()}`;
  }
}

export const zernioClient = new ZernioClient();
