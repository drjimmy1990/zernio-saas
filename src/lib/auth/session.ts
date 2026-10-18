export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'super_admin' | 'owner' | 'member';
}

export interface AuthTenant {
  organizationId: string;
  organizationName: string;
  slug: string;
  planKey: string;
}

export interface AuthSession {
  user: AuthUser;
  tenant: AuthTenant;
  createdAt: number;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = 'techurity_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_SECRET = process.env.SESSION_SECRET || 'techurity_secure_session_secret_2026';

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const l = data.length;
  const bitLen = l * 8;
  const padLen = (l % 64 < 56) ? 56 - (l % 64) : 120 - (l % 64);
  const totalLen = l + padLen + 8;
  const msg = new Uint8Array(totalLen);
  msg.set(data);
  msg[l] = 0x80;

  const view = new DataView(msg.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));

  const W = new Int32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getInt32(i + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3));
      const s1 = (rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10));
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, h0);
  outView.setInt32(4, h1);
  outView.setInt32(8, h2);
  outView.setInt32(12, h3);
  outView.setInt32(16, h4);
  outView.setInt32(20, h5);
  outView.setInt32(24, h6);
  outView.setInt32(28, h7);
  return out;
}

function hmacSha256(keyStr: string, msgStr: string): Uint8Array {
  const enc = new TextEncoder();
  let key: Uint8Array<ArrayBufferLike> = enc.encode(keyStr);
  const msg = enc.encode(msgStr);

  const blockSize = 64;
  if (key.length > blockSize) {
    key = sha256Bytes(key);
  }
  const keyPadded = new Uint8Array(blockSize);
  keyPadded.set(key);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyPadded[i] ^ 0x5c;
    iKeyPad[i] = keyPadded[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + msg.length);
  inner.set(iKeyPad);
  inner.set(msg, blockSize);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(blockSize + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, blockSize);
  return sha256Bytes(outer);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return (typeof Buffer !== 'undefined' ? Buffer.from(binary, 'binary').toString('base64url') : btoa(binary))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function utf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function computeSignature(payload: string): string {
  return bytesToBase64Url(hmacSha256(SESSION_SECRET, payload));
}

function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = computeSignature(payload);
    return timingSafeEqual(signature, expected);
  } catch {
    return false;
  }
}

export function encodeSession(session: AuthSession): string {
  const json = JSON.stringify(session);
  const base64Payload = utf8ToBase64(json);
  const signature = computeSignature(base64Payload);
  return `${base64Payload}.${signature}`;
}

export function decodeSession(token: string | null | undefined): AuthSession | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] = parts;
    if (!payload || !signature) {
      return null;
    }

    if (!verifySignature(payload, signature)) {
      return null;
    }

    const raw = base64ToUtf8(payload);
    const parsed = JSON.parse(raw) as AuthSession;

    if (!parsed || !parsed.user || !parsed.user.id || !parsed.user.role || !parsed.expiresAt) {
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(cookieHeader: string | null | undefined): AuthSession | null {
  if (!cookieHeader) return null;
  try {
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map((c) => c.trim().split('='))
        .filter(([k]) => Boolean(k))
        .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
    );
    return decodeSession(cookies[SESSION_COOKIE_NAME]);
  } catch {
    return null;
  }
}


