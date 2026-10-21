import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync('src/app/signup/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test('signup server wrapper selects registration view from the runtime flag on each request', () => {
  let enabled = false;
  const form = () => {}, closed = () => {}, exports = {};
  const require = name => {
    if (name === 'react/jsx-runtime') return { jsx: type => ({ type }) };
    if (name === '@/components/auth/SignUpForm') return { default: form };
    if (name === '@/components/auth/RegistrationComingSoon') return { default: closed };
    if (name === '@/lib/auth/registration') return { isPublicRegistrationEnabled: () => enabled };
    throw Error(name);
  };
  vm.runInNewContext(`(function(require,exports){${source}\n})`)(require, exports);
  assert.equal(exports.dynamic, 'force-dynamic');
  assert.equal(exports.default().type, closed);
  enabled = true;
  assert.equal(exports.default().type, form);
  enabled = false;
  assert.equal(exports.default().type, closed);
});
