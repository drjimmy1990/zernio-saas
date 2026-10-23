import { TenantAccessError } from '@/lib/auth/tenant-access';

export class AuthProviderError extends TenantAccessError {
  constructor(status: number, message: string, public readonly code: string) {
    super(status, message);
    this.name = 'AuthProviderError';
  }
}

/** Translate provider failures without exposing identities, credentials or messages. */
export function handleAuthProviderError(action: string, error: unknown): void {
  if (!error) return;
  const failure = error as { code?: unknown; status?: unknown; name?: unknown };
  const code = typeof failure.code === 'string' && /^[a-z_]{1,64}$/.test(failure.code) ? failure.code : 'unknown';
  const status = typeof failure.status === 'number' && Number.isFinite(failure.status) ? failure.status : 0;
  console.warn('[auth-provider]', action, code, status);
  const reject = (http: number, publicCode: string, message: string): never => { throw new AuthProviderError(http, message, publicCode); };
  if (status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code)) reject(429, 'auth_rate_limited', 'Too many authentication requests. Wait before trying again.');
  if (['email_address_not_authorized', 'email_provider_disabled'].includes(code)) reject(503, 'email_delivery_unavailable', 'Authentication email delivery is unavailable. Contact support.');
  if (code === 'signup_disabled') reject(503, 'signup_unavailable', 'New account registration is unavailable. Contact support.');
  if (code === 'captcha_failed') reject(503, 'auth_verification_unavailable', 'Authentication verification is unavailable. Contact support.');
  if (code === 'weak_password' && ['signup', 'complete_recovery', 'change_password'].includes(action)) reject(400, 'weak_password', 'Choose a stronger password that meets the account security requirements.');
  if (code === 'email_address_invalid') reject(400, 'invalid_email', 'Enter a valid email address.');
  if (status >= 500 || !status || failure.name === 'AuthRetryableFetchError') reject(503, 'auth_unavailable', 'Authentication services are unavailable. Try again later.');
  const identityErrors = ['user_not_found', 'email_not_confirmed', 'email_exists', 'user_already_exists', 'identity_already_exists'];
  if (['recover', 'resend'].includes(action) && identityErrors.includes(code)) return;
  if (['login', 'change_password'].includes(action)) reject(401, 'invalid_credentials', 'Invalid email or password. Verify your email before signing in.');
  if (action === 'signup') reject(400, 'registration_unconfirmed', 'Registration could not be confirmed. Sign in or request verification if the account exists.');
  if (['verify_email', 'complete_recovery'].includes(action)) reject(401, 'invalid_auth_link', 'This email link is invalid or expired. Request a new link.');
  reject(503, 'email_delivery_unavailable', 'Authentication email delivery could not be confirmed. Try again later.');
}
