import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const module = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/phone-lifecycle/sms-segments.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(`(function(exports){${source}\n})`, {})(module.exports);
const { smsSegments } = module.exports;

test('SMS segment count uses GSM single/multipart capacity and extension escape pairs', () => {
  assert.equal(smsSegments('a'.repeat(160)).segments, 1);
  assert.equal(smsSegments('a'.repeat(161)).segments, 2);
  assert.equal(smsSegments('a'.repeat(306)).segments, 2);
  assert.equal(smsSegments('a'.repeat(307)).segments, 3);
  assert.equal(smsSegments('^'.repeat(80)).segments, 1);
  assert.equal(smsSegments('^'.repeat(81)).segments, 2);
  assert.equal(smsSegments('^'.repeat(153)).segments, 3, 'An escape pair cannot be split between segments.');
  assert.equal(smsSegments('€').units, 2);
  assert.equal(smsSegments('€').encoding, 'GSM-7');
});

test('Arabic and emoji use UTF-16 units with no invented ASCII-only billing', () => {
  assert.equal(smsSegments('س'.repeat(70)).segments, 1);
  assert.equal(smsSegments('س'.repeat(71)).segments, 2);
  assert.equal(smsSegments('س'.repeat(134)).segments, 2);
  assert.equal(smsSegments('س'.repeat(135)).segments, 3);
  assert.equal(smsSegments('😀'.repeat(35)).segments, 1);
  assert.equal(smsSegments('😀'.repeat(36)).segments, 2);
  assert.equal(smsSegments('😀').units, 2);
  assert.equal(smsSegments('aس').encoding, 'UCS-2');
  assert.equal(smsSegments('').segments, 0);
});
