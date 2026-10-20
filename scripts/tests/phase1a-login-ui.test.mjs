import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/login/page.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function renderLogin(redirect, role = 'owner') {
  const pushes = [], requests = [], errors = [];
  let hook = 0;
  const labels = new Proxy({}, { get: () => labels });
  const exports = {};
  const require = (specifier) => {
    if (specifier === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (specifier === 'react') return {
      Suspense: 'suspense',
      useState: (initial) => {
        const index = hook++;
        return [index === 0 ? 'owner@example.invalid' : index === 1 ? 'isolated-password' : initial,
          (value) => { if (index === 3) errors.push(value); }];
      },
    };
    if (specifier === 'next/navigation') return {
      useRouter: () => ({ push: (url) => pushes.push(url) }),
      useSearchParams: () => new URLSearchParams(redirect == null ? '' : { redirect }),
    };
    if (specifier === 'next/link') return { default: 'link', __esModule: true };
    if (specifier === '@/i18n/ThemeAndLocaleProvider') return { useThemeAndLocale: () => ({ t: labels, locale: 'en', dir: 'ltr' }) };
    if (specifier === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
    if (specifier === '@/components/Asra3Logo') return { Asra3Logo: 'logo' };
    throw new Error(`Unexpected login dependency: ${specifier}`);
  };
  const context = vm.createContext({ URLSearchParams, console, fetch: async (url, options) => {
    requests.push({ url, options });
    return Response.json({ user: { role }, redirectTo: role === 'super_admin' ? '/admin' : '/dashboard?org=tenant-a' });
  } });
  vm.runInContext(`(function(require,exports) {\n${source}\n})`, context)(require, exports);
  const wrapper = exports.default();
  const tree = wrapper.props.children.type();
  function find(node, predicate) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, 'type')) return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  return { pushes, requests, errors,
    submit: () => find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    google: () => find(tree, (node) => node.type === 'button' && node.props.type === 'button').props.onClick(),
  };
}

test('successful login defaults to the correct customer or administrator screen', async () => {
  for (const [role, expected] of [['owner', '/dashboard?org=tenant-a'], ['super_admin', '/admin']]) {
    const ui = renderLogin(null, role);
    await ui.submit();
    assert.deepEqual(ui.pushes, [expected]);
    assert.equal(ui.requests.length, 1);
  }
});

test('login preserves app paths but rejects external, script and control-character redirects', async () => {
  for (const [redirect, expected] of [
    ['/dashboard?tab=connections', '/dashboard?tab=connections'],
    ['/admin', '/admin'], ['https://foreign.invalid', '/dashboard?org=tenant-a'],
    ['//foreign.invalid', '/dashboard?org=tenant-a'], ['javascript:alert(1)', '/dashboard?org=tenant-a'],
    ['/\\foreign.invalid', '/dashboard?org=tenant-a'], ['/\n/foreign.invalid', '/dashboard?org=tenant-a'],
    ['/\t/foreign.invalid', '/dashboard?org=tenant-a'],
  ]) {
    const ui = renderLogin(redirect);
    await ui.submit();
    assert.deepEqual(ui.pushes, [expected], `Unsafe redirect accepted: ${JSON.stringify(redirect)}`);
  }
});

test('Google placeholder reports unavailable without sending invented credentials', () => {
  const ui = renderLogin(null);
  ui.google();
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.pushes.length, 0);
  assert.match(ui.errors.at(-1), /not available/);
});
