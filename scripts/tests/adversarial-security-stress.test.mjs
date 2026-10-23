import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test, { describe } from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const secret = 'adversarial-challenger-private-key-2026';
const publicOrigin = 'https://asra3.com';

// Transpile target TypeScript modules for sandbox execution
const sourceFiles = {
  session: 'src/lib/auth/session.ts',
  origin: 'src/lib/auth/request-origin.ts',
  access: 'src/lib/auth/tenant-access.ts',
  delivery: 'src/lib/webhooks/delivery.ts',
  allowance: 'src/lib/saas/allowance.ts',
};

const transpiled = Object.fromEntries(
  Object.entries(sourceFiles).map(([key, file]) => [
    key,
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
  ])
);

function buildSandbox(customEnv = {}) {
  const env = {
    SESSION_SECRET: secret,
    NEXT_PUBLIC_APP_URL: publicOrigin,
    ADMIN_EMAIL: 'admin@asra3.com',
    ADMIN_PASSWORD: 'SuperSecureAdminPassword2026!',
    ...customEnv,
  };

  const context = vm.createContext({
    Buffer, Date, URL, Headers, Request, Response, TextEncoder, TextDecoder, console, setTimeout, clearTimeout, AbortSignal,
    process: { env },
  });

  const modules = new Map();
  function requireModule(name) {
    if (modules.has(name)) return modules.get(name);
    if (name === 'node:crypto' || name === 'crypto') return crypto;
    if (name === 'node:https' || name === 'https') return { request: () => { throw new Error('Live outbound HTTPS blocked in test'); } };
    if (name === 'node:net' || name === 'net') {
      return {
        isIP: (input) => {
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) return 4;
          if (input.includes(':')) return 6;
          return 0;
        },
      };
    }
    if (name === 'node:dns/promises') {
      return {
        lookup: async (rawHostname) => {
          const hostname = rawHostname.replace(/^\[|\]$/g, '');
          if (hostname === 'localhost' || hostname === '127.0.0.1') return [{ address: '127.0.0.1', family: 4 }];
          if (hostname === '169.254.169.254') return [{ address: '169.254.169.254', family: 4 }];
          if (hostname === 'metadata.google.internal') return [{ address: '169.254.169.254', family: 4 }];
          if (hostname === 'loopback6' || hostname === '::1') return [{ address: '::1', family: 6 }];
          if (hostname === 'public-webhook.example.com') return [{ address: '93.184.216.34', family: 4 }];
          if (hostname === 'public-ipv6.example.com') return [{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }];
          if (hostname === 'private-internal.corp') return [{ address: '10.0.0.5', family: 4 }];
          if (hostname === 'dns-rebinding.attacker.invalid') return [{ address: '127.0.0.1', family: 4 }];
          throw new Error(`ENOTFOUND ${hostname}`);
        },
      };
    }
    if (name === '@/lib/supabase/admin' || name === '@/lib/saas/auth' || name === './storage') return {};

    const fileKey = name.replace('@/lib/auth/', '').replace('@/lib/webhooks/', '').replace('@/lib/saas/', '');
    const mappedKey = { 'request-origin': 'origin', 'tenant-access': 'access', 'session': 'session', 'delivery': 'delivery', 'allowance': 'allowance' }[fileKey] || fileKey;

    if (!transpiled[mappedKey]) throw new Error(`Unexpected require: ${name}`);

    const moduleObj = { exports: {} };
    modules.set(name, moduleObj.exports);
    vm.runInContext(`(function(require, module, exports) {\n${transpiled[mappedKey]}\n})`, context)(
      requireModule, moduleObj, moduleObj.exports
    );
    modules.set(name, moduleObj.exports);
    return moduleObj.exports;
  }

  return {
    requireModule,
    origin: requireModule('@/lib/auth/request-origin'),
    session: requireModule('@/lib/auth/session'),
    access: requireModule('@/lib/auth/tenant-access'),
    delivery: requireModule('@/lib/webhooks/delivery'),
    allowance: requireModule('@/lib/saas/allowance'),
    env,
  };
}

describe('Adversarial Stress Testing: Reverse Proxy Origin Guards & Tenant Isolation', () => {

  // =========================================================================
  // 1. REVERSE PROXY ORIGIN GUARD & HOST HEADER POISONING
  // =========================================================================
  describe('Origin Guard & Host Header Poisoning', () => {
    test('legitimate requests matching NEXT_PUBLIC_APP_URL are allowed', () => {
      const { origin } = buildSandbox();
      const req = new Request('http://127.0.0.1:3008/api/connect', {
        method: 'POST',
        headers: {
          origin: publicOrigin,
          'sec-fetch-site': 'same-origin',
        },
      });
      assert.equal(origin.checkRequestOrigin(req), 'allowed');
    });

    test('container port leakage is strictly rejected (https://asra3.com:3000, 3008)', () => {
      const { origin } = buildSandbox();
      const leakedPorts = [
        'https://asra3.com:3000',
        'https://asra3.com:3008',
        'http://asra3.com:3008',
        'http://127.0.0.1:3008',
        'http://localhost:3000',
        'http://localhost:3008',
      ];
      for (const badOrigin of leakedPorts) {
        const req = new Request('http://127.0.0.1:3008/api/connect', {
          method: 'POST',
          headers: { origin: badOrigin },
        });
        assert.equal(origin.checkRequestOrigin(req), 'cross-origin', `Leaked port origin '${badOrigin}' must be rejected`);
      }
    });

    test('host header poisoning and forwarded spoofing cannot override expected origin', () => {
      const { origin } = buildSandbox();
      const spoofedReq = new Request('http://127.0.0.1:3008/api/services', {
        method: 'POST',
        headers: {
          host: 'attacker.com',
          'x-forwarded-host': 'attacker.com',
          'x-forwarded-proto': 'https',
          'x-forwarded-for': '1.2.3.4',
          forwarded: 'host=attacker.com;proto=https',
          origin: 'https://attacker.com',
        },
      });
      assert.equal(origin.checkRequestOrigin(spoofedReq), 'cross-origin');
    });

    test('adversarial origin URI variants fail closed', () => {
      const { origin } = buildSandbox();
      const adversarialOrigins = [
        'https://asra3.com@evil.com',
        'https://asra3.com.evil.com',
        'https://evil.com#asra3.com',
        'https://evil.com?asra3.com',
        'https://not-asra3.com',
        'https://asra3.com.attacker.org',
        'http://asra3.com',             // protocol downgrade
        'https://asra3.com:444',        // port mismatch
        'null',                         // sandboxed iframe / privacy origin
        '',                             // empty string
        'https://asra3.com/',           // trailing slash
        'https://asra3.com/api',        // path traversal attempt
        'https://asra3.com https://evil.com', // header injection
        'javascript:alert(1)',
        'data:text/html,test',
      ];

      for (const adv of adversarialOrigins) {
        const req = new Request('http://127.0.0.1:3008/api/crm', {
          method: 'POST',
          headers: { origin: adv },
        });
        assert.equal(origin.checkRequestOrigin(req), 'cross-origin', `Adversarial origin '${adv}' must be rejected`);
      }
    });

    test('Sec-Fetch-Site cross-site is rejected even if Origin matches or is absent', () => {
      const { origin } = buildSandbox();
      const crossSiteWithValidOrigin = new Request('http://127.0.0.1:3008/api/campaigns', {
        method: 'POST',
        headers: {
          origin: publicOrigin,
          'sec-fetch-site': 'cross-site',
        },
      });
      assert.equal(origin.checkRequestOrigin(crossSiteWithValidOrigin), 'cross-origin');

      const crossSiteWithoutOrigin = new Request('http://127.0.0.1:3008/api/campaigns', {
        method: 'POST',
        headers: {
          'sec-fetch-site': 'cross-site',
        },
      });
      assert.equal(origin.checkRequestOrigin(crossSiteWithoutOrigin), 'cross-origin');
    });

    test('server misconfiguration in NEXT_PUBLIC_APP_URL fails closed with misconfigured status', () => {
      const misconfiguredUrls = [
        'asra3.com',                      // missing protocol
        '/relative/url',                  // relative
        'ftp://asra3.com',                // unsupported scheme
        'file:///etc/passwd',
        'https://user:password@asra3.com', // embedded userinfo
        '   ',
      ];

      for (const badUrl of misconfiguredUrls) {
        const { origin } = buildSandbox({ NEXT_PUBLIC_APP_URL: badUrl });
        const req = new Request('http://127.0.0.1:3008/api/connect', {
          method: 'POST',
          headers: { origin: publicOrigin },
        });
        assert.equal(origin.checkRequestOrigin(req), 'misconfigured');
      }
    });
  });

  // =========================================================================
  // 2. STATE-CHANGING API ENDPOINTS ORIGIN ENFORCEMENT
  // =========================================================================
  describe('Origin Spoofing on State-Changing API Endpoints', () => {
    function createSessionCookie(sessionMod, tenantId = 'tenant-a') {
      const sessionData = {
        user: { id: 'usr-1', fullName: 'Alice', email: 'alice@example.com', role: 'owner' },
        tenant: { organizationId: tenantId, organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'pro' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        sessionId: 'session-123',
      };
      return `${sessionMod.SESSION_COOKIE_NAME}=${sessionMod.encodeSession(sessionData)}`;
    }

    test('requireTenantSession rejects cross-origin on POST/PUT/DELETE for all state-changing endpoints', () => {
      const { session, access } = buildSandbox();
      const cookie = createSessionCookie(session);

      const endpoints = [
        '/api/connect',
        '/api/services',
        '/api/crm',
        '/api/campaigns',
        '/api/phone-lifecycle',
      ];

      const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const endpoint of endpoints) {
        for (const method of mutatingMethods) {
          const req = new Request(`http://127.0.0.1:3008${endpoint}`, {
            method,
            headers: {
              cookie,
              origin: 'https://evil-spoofed-origin.com',
            },
          });

          assert.throws(
            () => access.requireTenantSession(req, 'tenant-a'),
            (err) => err.status === 403 && /cross-origin/i.test(err.message),
            `Endpoint ${method} ${endpoint} must reject cross-origin requests with 403`
          );
        }
      }
    });

    test('safe read methods (GET, HEAD, OPTIONS) do not require Origin match', () => {
      const { session, access } = buildSandbox();
      const cookie = createSessionCookie(session);

      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        const req = new Request('http://127.0.0.1:3008/api/services', {
          method,
          headers: {
            cookie,
            origin: 'https://external-reader.com',
          },
        });

        const auth = access.requireTenantSession(req, 'tenant-a');
        assert.equal(auth.tenant.organizationId, 'tenant-a');
      }
    });
  });

  // =========================================================================
  // 3. CROSS-TENANT PARAMETER TAMPERING
  // =========================================================================
  describe('Cross-Tenant Organization ID Parameter Tampering', () => {
    function createSessionCookie(sessionMod, tenantId = 'tenant-a') {
      const sessionData = {
        user: { id: 'usr-tenant-a', fullName: 'Alice Tenant A', email: 'alice@tenant-a.com', role: 'owner' },
        tenant: { organizationId: tenantId, organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'pro' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        sessionId: 'session-a',
      };
      return `${sessionMod.SESSION_COOKIE_NAME}=${sessionMod.encodeSession(sessionData)}`;
    }

    test('tampering requestedOrganizationId to Tenant B fails closed with HTTP 403', () => {
      const { session, access } = buildSandbox();
      const cookieTenantA = createSessionCookie(session, 'tenant-a');

      const req = new Request('http://127.0.0.1:3008/api/crm?organizationId=tenant-b', {
        method: 'GET',
        headers: { cookie: cookieTenantA },
      });

      // Tenant A attempts to request Tenant B
      assert.throws(
        () => access.requireTenantSession(req, 'tenant-b'),
        (err) => err.status === 403 && /cannot access another workspace/i.test(err.message),
        'Attempt to pass tenant-b while holding tenant-a session must throw 403'
      );
    });

    test('cross-tenant parameter tampering across all endpoint paths', () => {
      const { session, access } = buildSandbox();
      const cookieTenantA = createSessionCookie(session, 'tenant-a');

      const tamperedTargets = [
        'tenant-b',
        'tenant_secret_victim',
        'org_admin_platform',
        'default_tenant',
        'null',
        '..',
        'tenant-a/../tenant-b',
      ];

      for (const target of tamperedTargets) {
        const req = new Request('http://127.0.0.1:3008/api/phone-lifecycle', {
          method: 'POST',
          headers: {
            cookie: cookieTenantA,
            origin: publicOrigin,
          },
        });

        assert.throws(
          () => access.requireTenantSession(req, target),
          (err) => err.status === 403,
          `Tampered organization ID '${target}' must be rejected with 403`
        );
      }
    });

    test('matching organizationId succeeds and returns authenticated session', () => {
      const { session, access } = buildSandbox();
      const cookieTenantA = createSessionCookie(session, 'tenant-a');

      const req = new Request('http://127.0.0.1:3008/api/crm', {
        method: 'POST',
        headers: {
          cookie: cookieTenantA,
          origin: publicOrigin,
        },
      });

      const verified = access.requireTenantSession(req, 'tenant-a');
      assert.equal(verified.tenant.organizationId, 'tenant-a');
      assert.equal(verified.user.id, 'usr-tenant-a');
    });
  });

  // =========================================================================
  // 4. FORGED SESSION TOKENS & SIGNATURE TAMPERING
  // =========================================================================
  describe('Session Token Forgery & Cookie Tampering', () => {
    test('tampering with session payload json invalidates HMAC signature and returns null', () => {
      const { session } = buildSandbox();
      const validSession = {
        user: { id: 'usr-1', fullName: 'Alice', email: 'alice@example.com', role: 'member' },
        tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'starter' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      const originalToken = session.encodeSession(validSession);
      const [payloadB64, signature] = originalToken.split('.');

      // Attacker decodes base64 payload, changes role to 'super_admin' and tenant to 'tenant-b'
      const decodedJson = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
      decodedJson.user.role = 'super_admin';
      decodedJson.tenant.organizationId = 'tenant-b';

      const forgedPayloadB64 = Buffer.from(JSON.stringify(decodedJson)).toString('base64');
      const tamperedToken = `${forgedPayloadB64}.${signature}`;

      assert.equal(session.decodeSession(tamperedToken), null, 'Tampered payload with old signature must return null');
    });

    test('bit-flipping or altering HMAC signature returns null', () => {
      const { session } = buildSandbox();
      const validSession = {
        user: { id: 'usr-1', fullName: 'Alice', email: 'alice@example.com', role: 'member' },
        tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'starter' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };
      const token = session.encodeSession(validSession);
      const [payload, sig] = token.split('.');

      // Alter signature characters
      const corruptedSig = sig.slice(0, -2) + (sig.slice(-2) === 'aa' ? 'bb' : 'aa');
      assert.equal(session.decodeSession(`${payload}.${corruptedSig}`), null);

      // Truncated signature
      assert.equal(session.decodeSession(`${payload}.${sig.slice(0, 10)}`), null);

      // Empty signature
      assert.equal(session.decodeSession(`${payload}.`), null);
      assert.equal(session.decodeSession(payload), null);
    });

    test('signing with different or default insecure key is rejected', () => {
      const validSession = {
        user: { id: 'usr-1', fullName: 'Alice', email: 'alice@example.com', role: 'member' },
        tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'starter' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      // Attacker uses another key
      const attackerSandbox = buildSandbox({ SESSION_SECRET: 'attacker-chosen-secret-key-12345' });
      const attackerToken = attackerSandbox.session.encodeSession(validSession);

      // Server validates with server secret
      const serverSandbox = buildSandbox({ SESSION_SECRET: secret });
      assert.equal(serverSandbox.session.decodeSession(attackerToken), null, 'Token signed with foreign secret must be rejected');

      // Attempting to use default insecure secret
      assert.throws(
        () => buildSandbox({ SESSION_SECRET: 'asra3_secure_session_secret_2026' }).session.encodeSession(validSession),
        /SESSION_SECRET/
      );
    });

    test('expired or non-finite timestamp is rejected', () => {
      const { session } = buildSandbox();

      const expiredSession = {
        user: { id: 'usr-1', fullName: 'Alice', email: 'alice@example.com', role: 'member' },
        tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'tenant-a', planKey: 'starter' },
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000, // 1 hour ago
      };
      const expiredToken = session.encodeSession(expiredSession);
      assert.equal(session.decodeSession(expiredToken), null, 'Expired session must return null');

      // Non-finite expiresAt
      const rawPayload = Buffer.from(JSON.stringify({
        ...expiredSession,
        expiresAt: 'never',
      })).toString('base64');
      const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('base64url');
      assert.equal(session.decodeSession(`${rawPayload}.${sig}`), null, 'Non-number expiresAt must return null');
    });

    test('forged super_admin identity without credential hash is rejected by requireTenantAccess', async () => {
      const { session, access } = buildSandbox();

      // Attacker creates a signed token with role='super_admin'
      const forgedAdminSession = {
        user: { id: 'usr_super_admin', fullName: 'Admin', email: 'admin@asra3.com', role: 'super_admin' },
        tenant: { organizationId: 'org_admin_platform', organizationName: 'Platform', slug: 'platform', planKey: 'admin' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        // Notice: adminCredentialVersion is omitted or forged
        adminCredentialVersion: 'forged_fake_hash',
      };
      const cookie = `${session.SESSION_COOKIE_NAME}=${session.encodeSession(forgedAdminSession)}`;

      const req = new Request('http://127.0.0.1:3008/api/services', {
        method: 'POST',
        headers: { cookie, origin: publicOrigin },
      });

      await assert.rejects(
        async () => access.requireTenantAccess(req),
        (err) => err.status === 401 && /credentials changed/i.test(err.message),
        'Forged super_admin token without matching sha256(email:password) must be rejected with 401'
      );
    });
  });

  // =========================================================================
  // 5. SSRF ATTACKS AGAINST WEBHOOK DELIVERY
  // =========================================================================
  describe('SSRF Protection on Customer Webhook Delivery', () => {
    const rawPayload = JSON.stringify({ event: 'test_dispatch' });
    const headers = { 'content-type': 'application/json' };

    test('rejects HTTP protocol (requires public HTTPS)', async () => {
      const { delivery } = buildSandbox();
      const httpUrls = [
        'http://169.254.169.254/latest/meta-data',
        'http://127.0.0.1:8080/internal',
        'http://[::1]/admin',
        'http://example.com/webhook',
        'ftp://example.com/webhook',
        'file:///etc/shadow',
        'gopher://127.0.0.1:6379',
      ];

      for (const url of httpUrls) {
        await assert.rejects(
          () => delivery.deliverCustomerWebhook(url, rawPayload, headers),
          /must be public HTTPS/i,
          `URL '${url}' must be rejected for non-HTTPS protocol`
        );
      }
    });

    test('rejects non-standard ports (must be port 443)', async () => {
      const { delivery } = buildSandbox();
      const badPortUrls = [
        'https://example.com:8080/webhook',
        'https://example.com:8443/webhook',
        'https://example.com:3000/webhook',
        'https://example.com:22/webhook',
      ];

      for (const url of badPortUrls) {
        await assert.rejects(
          () => delivery.deliverCustomerWebhook(url, rawPayload, headers),
          /must be public HTTPS/i,
          `Non-standard port '${url}' must be rejected`
        );
      }
    });

    test('rejects userinfo credential injection in URL', async () => {
      const { delivery } = buildSandbox();
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://admin:pass@example.com/webhook', rawPayload, headers),
        /must be public HTTPS/i
      );
    });

    test('blocks AWS/Cloud metadata IP (169.254.169.254) even over HTTPS', async () => {
      const { delivery } = buildSandbox();
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://169.254.169.254/latest/meta-data', rawPayload, headers),
        /Private webhook destination/i,
        'AWS metadata IP 169.254.169.254 must be blocked'
      );

      // Also hostname resolving to metadata
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://metadata.google.internal/computeMetadata/v1/', rawPayload, headers),
        /Private webhook destination/i,
        'GCP metadata hostname resolving to 169.254.169.254 must be blocked'
      );
    });

    test('blocks loopback addresses (127.0.0.1, localhost, [::1])', async () => {
      const { delivery } = buildSandbox();
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://127.0.0.1/webhook', rawPayload, headers),
        /Private webhook destination/i
      );
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://localhost/webhook', rawPayload, headers),
        /Private webhook destination/i
      );
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://[::1]/webhook', rawPayload, headers),
        /Private webhook destination/i
      );
    });

    test('blocks internal RFC 1918 and carrier NAT private IP ranges', async () => {
      const { delivery } = buildSandbox();

      // Test host resolving to 10.0.0.5
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://private-internal.corp/hook', rawPayload, headers),
        /Private webhook destination/i,
        'Private 10.0.0.0/8 range must be blocked'
      );

      // Test DNS rebinding resolving to 127.0.0.1
      await assert.rejects(
        () => delivery.deliverCustomerWebhook('https://dns-rebinding.attacker.invalid/hook', rawPayload, headers),
        /Private webhook destination/i,
        'DNS rebinding to 127.0.0.1 must be blocked'
      );
    });

    test('comprehensive empirical check of publicAddress filter logic against IP ranges', () => {
      // Extract publicAddress function from delivery module sources
      const exportsObj = {};
      const context = vm.createContext({
        Buffer, console, exports: exportsObj, module: { exports: exportsObj },
        require: (name) => {
          if (name === 'node:net' || name === 'net') {
            return {
              isIP: (input) => {
                if (/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) return 4;
                if (input.includes(':')) return 6;
                return 0;
              },
            };
          }
          if (name === 'node:https' || name === 'https') return {};
          if (name === 'node:dns/promises') return {};
          throw new Error(`Unexpected require in helper test: ${name}`);
        },
        net: {
          isIP: (input) => {
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) return 4;
            if (input.includes(':')) return 6;
            return 0;
          },
        },
      });

      const deliveryScript = transpiled.delivery;
      const fn = vm.runInContext(`
        (function() {
          ${deliveryScript}
          return publicAddress;
        })()
      `, context);

      assert.equal(typeof fn, 'function', 'publicAddress helper must be extractable');

      // Private IPv4 ranges that MUST return false (blocked)
      const blockedIpv4 = [
        '127.0.0.1', '127.0.0.2', '127.255.255.255',      // Loopback
        '10.0.0.1', '10.255.255.254',                     // RFC 1918 Class A
        '172.16.0.1', '172.20.1.1', '172.31.255.254',     // RFC 1918 Class B
        '192.168.0.1', '192.168.1.254',                   // RFC 1918 Class C
        '169.254.169.254', '169.254.1.1',                 // Link-local / Cloud metadata
        '100.64.0.1', '100.127.255.254',                  // Carrier-Grade NAT
        '192.0.0.1', '192.0.2.1',                         // TEST-NET-1
        '198.18.0.1', '198.19.255.254',                   // Network benchmark tests
        '198.51.100.1',                                   // TEST-NET-2
        '203.0.113.1',                                    // TEST-NET-3
        '0.0.0.0', '0.1.2.3',                             // "This host"
        '224.0.0.1', '239.255.255.255',                   // Multicast
        '240.0.0.1', '255.255.255.255',                   // Reserved / Broadcast
      ];

      for (const ip of blockedIpv4) {
        assert.equal(fn(ip), false, `Private IP ${ip} must be blocked by publicAddress`);
      }

      // Blocked IPv6 ranges that MUST return false
      const blockedIpv6 = [
        '::1',                                            // Loopback
        'fe80::1', 'fe80::abcd:1234',                     // Link-local
        'fc00::1', 'fd00::1',                             // Unique local
        '2001:db8::1', '2001:db8:85a3::1',               // Documentation prefix (RFC 3849)
        '2001:0::1', '2001:2::1',                         // Teredo / Benchmarking (RFC 4380 / RFC 5180)
        'ff02::1',                                        // Multicast
      ];

      for (const ip of blockedIpv6) {
        assert.equal(fn(ip), false, `Private IPv6 ${ip} must be blocked by publicAddress`);
      }

      // Valid Public IPv4 and IPv6 that MUST return true (allowed)
      const allowedIps = [
        '93.184.216.34',                                  // example.com
        '8.8.8.8',                                        // Google DNS
        '1.1.1.1',                                        // Cloudflare
        '151.101.1.69',                                   // Fastly
        '2606:2800:220:1:248:1893:25c8:1946',             // Global unicast IPv6
        '2a00:1450:4009:81f::200e',                       // Google IPv6
      ];

      for (const ip of allowedIps) {
        assert.equal(fn(ip), true, `Public IP ${ip} must be allowed by publicAddress`);
      }
    });
  });

  // =========================================================================
  // 6. PROVIDER SPENDING ALLOWANCE OVERSUBSCRIPTION
  // =========================================================================
  describe('Provider Spending Allowance Oversubscription', () => {
    test('invalid units, negative amounts, or non-integer minor units fail validation before reservation', async () => {
      const { allowance } = buildSandbox();
      const service = allowance.SaasAllowanceService;

      // Negative units
      await assert.rejects(
        () => service.reserveUnits({ organizationId: 'tenant-a', capability: 'whatsapp_send', operationKey: 'op-1', units: -5 }),
        (err) => err.status === 400 && /positive explicit unit count/i.test(err.message)
      );

      // Fractional units
      await assert.rejects(
        () => service.reserveUnits({ organizationId: 'tenant-a', capability: 'whatsapp_send', operationKey: 'op-2', units: 1.5 }),
        (err) => err.status === 400 && /positive explicit unit count/i.test(err.message)
      );

      // Zero units
      await assert.rejects(
        () => service.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'op-3', units: 0 }),
        (err) => err.status === 400 && /positive explicit unit count/i.test(err.message)
      );

      // Negative amountMinor
      await assert.rejects(
        () => service.reserve({ organizationId: 'tenant-a', capability: 'phone_purchase', operationKey: 'op-4', amountMinor: -100, quoteSource: 'provider' }),
        (err) => err.status === 400 && /nonnegative/i.test(err.message)
      );

      // Non-USD currency
      await assert.rejects(
        () => service.reserve({ organizationId: 'tenant-a', capability: 'phone_purchase', operationKey: 'op-5', amountMinor: 500, currency: 'EUR', quoteSource: 'provider' }),
        (err) => err.status === 400 && /USD allowance/i.test(err.message)
      );

      // Missing quote source
      await assert.rejects(
        () => service.reserve({ organizationId: 'tenant-a', capability: 'phone_purchase', operationKey: 'op-6', amountMinor: 500, quoteSource: '   ' }),
        (err) => err.status === 400 && /verified quote source/i.test(err.message)
      );
    });

    test('non-super_admin actors cannot grant spending allowance', async () => {
      const { allowance } = buildSandbox();
      const service = allowance.SaasAllowanceService;

      await assert.rejects(
        () => service.grant({
          organizationId: 'tenant-a',
          actorId: 'usr_regular_owner',
          amountMinor: 5000,
          operationKey: 'grant-1',
          reason: 'Attempted self-grant',
        }),
        (err) => err.status === 403 && /platform administrator/i.test(err.message)
      );
    });

    test('spending capabilities are strictly checked against SPENDING_CAPABILITIES catalog', async () => {
      const { allowance } = buildSandbox();
      const service = allowance.SaasAllowanceService;

      await assert.rejects(
        () => service.reserveUnits({
          organizationId: 'tenant-a',
          capability: 'unlimited_money_glitch',
          operationKey: 'glitch-1',
          units: 10,
        }),
        (err) => err.status === 400 && /unknown spending capability/i.test(err.message)
      );
    });

    test('concurrent reservation requests with simulated quota exhaustion reject oversubscription', async () => {
      // Simulate an atomic RPC handler where organization has only 10 units balance
      let currentAllowanceUnits = 10;
      const reservations = [];

      class MockSupabaseClient {
        async rpc(name, params) {
          if (name === 'saas_reserve_allowance') {
            const requested = params.p_units || 1;
            if (currentAllowanceUnits < requested) {
              return { data: null, error: { code: 'P0001', message: 'Allowance balance exceeded' } };
            }
            currentAllowanceUnits -= requested;
            const res = {
              reservationId: `res-${reservations.length + 1}`,
              state: 'reserved',
              amountMinor: requested * 50,
              currency: 'USD',
              replayed: false,
              quoteSource: params.p_quote_source,
            };
            reservations.push(res);
            return { data: res, error: null };
          }
          return { data: null, error: { message: 'Unknown rpc' } };
        }
      }

      // Create sandbox where saasRpc calls our MockSupabaseClient
      const context = vm.createContext({
        Buffer, console, Date, URL, TextEncoder, TextDecoder,
        process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' } },
      });

      const allowanceSource = transpiled.allowance;
      const modules = new Map();

      function req(name) {
        if (modules.has(name)) return modules.get(name);
        if (name === 'node:crypto' || name === 'crypto') return crypto;
        if (name === '@/lib/auth/tenant-access') {
          return {
            TenantAccessError: class TenantAccessError extends Error {
              constructor(status, message) { super(message); this.status = status; }
            },
          };
        }
        if (name === './storage') {
          const db = new MockSupabaseClient();
          return {
            saasRpc: async (rpcName, params) => {
              const { data, error } = await db.rpc(rpcName, params);
              if (error?.code === 'P0001') {
                const { TenantAccessError } = req('@/lib/auth/tenant-access');
                throw new TenantAccessError(409, error.message);
              }
              if (error) {
                const { TenantAccessError } = req('@/lib/auth/tenant-access');
                throw new TenantAccessError(503, error.message);
              }
              return data;
            },
          };
        }
        throw new Error(`Unexpected require: ${name}`);
      }

      const mod = { exports: {} };
      vm.runInContext(`(function(require, module, exports) {\n${allowanceSource}\n})`, context)(req, mod, mod.exports);
      const SaasAllowance = mod.exports.SaasAllowanceService;

      // Launch 5 concurrent purchase/campaign reservation attempts of 3 units each
      // Total requested = 15 units, but only 10 are available!
      // Exactly 3 requests (9 units) must succeed, and the remaining 2 must be rejected with 409!
      const attempts = [
        SaasAllowance.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'conc-1', units: 3 }),
        SaasAllowance.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'conc-2', units: 3 }),
        SaasAllowance.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'conc-3', units: 3 }),
        SaasAllowance.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'conc-4', units: 3 }),
        SaasAllowance.reserveUnits({ organizationId: 'tenant-a', capability: 'campaign_send', operationKey: 'conc-5', units: 3 }),
      ];

      const results = await Promise.allSettled(attempts);
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.equal(succeeded.length, 3, 'Exactly 3 reservations of 3 units (9 total) should succeed within the 10-unit allowance');
      assert.equal(rejected.length, 2, 'The 2 oversubscribing requests must be rejected with 409 error');
      assert.equal(currentAllowanceUnits, 1, 'Remaining allowance units must be exactly 1 unit');

      for (const rej of rejected) {
        assert.equal(rej.reason.status, 409);
        assert.match(rej.reason.message, /allowance balance exceeded/i);
      }
    });
  });
});
