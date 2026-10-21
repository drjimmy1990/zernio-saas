/** Public registration stays closed during private testing unless explicitly opened. */
export function isPublicRegistrationEnabled(): boolean {
  return process.env.PUBLIC_REGISTRATION_ENABLED === 'true';
}
