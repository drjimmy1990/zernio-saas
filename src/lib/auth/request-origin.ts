/** Check browser writes against the public site, including behind an HTTPS proxy. */
export function checkRequestOrigin(request: Request): 'allowed' | 'cross-origin' | 'misconfigured' {
  let expectedOrigin: string;
  try {
    // Use server-owned configuration, never forwarded headers supplied by a caller.
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const url = new URL(configuredUrl || request.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return 'misconfigured';
    }
    expectedOrigin = url.origin;
  } catch {
    return 'misconfigured';
  }

  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site' ||
      (origin !== null && origin !== expectedOrigin)) {
    return 'cross-origin';
  }
  return 'allowed';
}
