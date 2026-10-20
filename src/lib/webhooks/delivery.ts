import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function publicAddress(address: string) {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0|2):/i.test(address);
  const [a, b] = address.split('.').map(Number);
  return a > 0 && a !== 10 && a !== 127 && a < 224 &&
    !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && [0, 168].includes(b)) && !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 198 && [18, 19, 51].includes(b)) && !(a === 203 && b === 0);
}

/** Resolve once and pin the checked IP in the TLS request to prevent DNS rebinding. */
export async function deliverCustomerWebhook(url: string, raw: string, headers: Record<string, string>) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password || (target.port && target.port !== '443')) {
    throw new Error('Webhook destination must be public HTTPS');
  }
  const signal = AbortSignal.timeout(3500);
  const addresses = await Promise.race([
    lookup(target.hostname, { all: true }),
    new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new Error('DNS timeout')), { once: true })),
  ]);
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Private webhook destination');
  const pinned = addresses[0];
  return new Promise<number>((resolve, reject) => {
    const request = https.request(target, {
      method: 'POST', signal, headers,
      lookup: (_hostname, options, callback) => {
        // Modern Node asks for all addresses when autoSelectFamily is enabled.
        if (typeof options === 'object' && options.all) {
          (callback as unknown as (error: null, values: Array<{ address: string; family: number }>) => void)(null, [pinned]);
        } else callback(null, pinned.address, pinned.family);
      },
    }, (response) => {
      // Redirects are not followed. Drain the response without buffering it.
      response.resume();
      resolve(response.statusCode || 0);
    });
    request.on('error', reject);
    request.end(raw);
  });
}
