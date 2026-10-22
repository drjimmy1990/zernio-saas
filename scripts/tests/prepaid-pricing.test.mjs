import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(fs.readFileSync('src/lib/billing/pricing.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(`(function(exports){${source}\n})`, {}).call(null, exports);
const { PRICING, retailAmountMinor, starterMonthlyMinor, requiredWalletBalanceMinor } = exports;

test('retail charge gives a 40 percent margin and rounds upward to exact cents', () => {
 assert.equal(retailAmountMinor(300), 500);
 assert.equal(retailAmountMinor(301), 502);
 assert.equal(retailAmountMinor(1), 2);
 assert.equal(retailAmountMinor(0), 0);
 assert.equal(retailAmountMinor(300, 0), 300);
 for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => retailAmountMinor(value));
 for (const margin of [-1, 10000, 2.5, NaN]) assert.throws(() => retailAmountMinor(300, margin));
 assert.throws(() => retailAmountMinor(Number.MAX_SAFE_INTEGER));
});

test('Starter includes two accounts and bills eight dollars per additional account', () => {
 assert.equal(starterMonthlyMinor(0), 2000);
 assert.equal(starterMonthlyMinor(2), 2000);
 assert.equal(starterMonthlyMinor(3), 2800);
 assert.equal(starterMonthlyMinor(5), 4400);
 assert.throws(() => starterMonthlyMinor(2.5));
 assert.throws(() => starterMonthlyMinor(Number.MAX_SAFE_INTEGER));
 assert.equal(PRICING.minimumTopupMinor, 1000);
});

test('balance floors never replace a higher quoted reservation', () => {
 assert.equal(requiredWalletBalanceMinor('voice_call', 100), 500);
 assert.equal(requiredWalletBalanceMinor('voice_call', 900), 900);
 assert.equal(requiredWalletBalanceMinor('sms_send', 10), 200);
 assert.equal(requiredWalletBalanceMinor('sms_send', 300), 300);
 assert.equal(requiredWalletBalanceMinor('other', 300), 300);
 assert.throws(() => requiredWalletBalanceMinor('voice_call', -1));
});
