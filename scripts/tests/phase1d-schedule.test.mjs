import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/publishing/schedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {}; vm.runInNewContext(`(function(exports){${source}\n})`, { Intl, Date, Set })(exports);
const { publishingScheduleInstant: instant, publishingWallTime: wall } = exports;
test('Cairo winter and summer use the selected IANA zone', () => {
 assert.equal(instant('2027-01-15T10:30', 'Africa/Cairo'), '2027-01-15T08:30:00.000Z');
 assert.equal(instant('2027-07-15T10:30', 'Africa/Cairo'), '2027-07-15T07:30:00.000Z');
});
test('NY spring gap and fall fold reject instead of silently choosing a time', () => {
 assert.throws(() => instant('2027-03-14T02:30', 'America/New_York'), /does not exist/);
 assert.throws(() => instant('2027-11-07T01:30', 'America/New_York'), /occurs twice/);
 assert.equal(instant('2027-03-14T03:30', 'America/New_York'), '2027-03-14T07:30:00.000Z');
});
test('invalid dates, times and zones are rejected', () => {
 for (const value of ['2027-02-30T10:00', '2027-13-01T10:00', '2027-01-01T25:00', 'bad']) assert.throws(() => instant(value, 'UTC'), /valid date/);
 assert.throws(() => instant('2027-01-01T10:00', 'Invalid/Zone'), /IANA/);
 assert.throws(() => wall('2027-01-01T10:00', 'UTC'), /offset/);
});
test('walltime roundtrips across positive, negative and fractional offsets', () => {
 for (const zone of ['Africa/Cairo', 'America/New_York', 'Asia/Kathmandu', 'Pacific/Kiritimati', 'UTC']) {
  const value = '2027-07-15T10:30'; assert.equal(wall(instant(value, zone), zone), value);
 }
 assert.equal(wall('2027-01-15T10:30:00+02:00', 'America/New_York'), '2027-01-15T03:30');
});
