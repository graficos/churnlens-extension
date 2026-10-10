import { test } from 'node:test';
import * as assert from 'node:assert';
import { parseNumstat, toFileChurnMap } from './parse';

const SEP = '\u001f';

const RAW = [
  `@@@aaa${SEP}Alice${SEP}2026-01-02T10:00:00+00:00${SEP}feat: init`,
  '3\t0\tsrc/a.ts',
  '-\t-\tassets/logo.png',
  '',
  `@@@bbb${SEP}Bob${SEP}2026-01-03T10:00:00+00:00${SEP}fix: edit a`,
  '0\t5\tsrc/a.ts',
  '',
  `@@@ccc${SEP}Bob${SEP}2026-01-04T10:00:00+00:00${SEP}refactor: add b`,
  '10\t0\tsrc/b.ts',
].join('\n');

test('parses records and treats binary as zero', () => {
  const records = parseNumstat(RAW);
  assert.equal(records.length, 4);

  const binary = records.find((r) => r.path === 'assets/logo.png');
  assert.ok(binary);
  assert.equal(binary?.added, 0);
  assert.equal(binary?.deleted, 0);

  const withSpaces = records.find((r) => r.subject === 'fix: edit a');
  assert.ok(withSpaces);
});

test('aggregates churn and delta per file and counts commits', () => {
  const map = toFileChurnMap(parseNumstat(RAW), (p) => '/repo/' + p);

  const a = map.get('/repo/src/a.ts');
  assert.ok(a);
  assert.equal(a?.added, 3);
  assert.equal(a?.deleted, 5);
  assert.equal(a?.churn, 8);
  assert.equal(a?.delta, -2);
  assert.equal(a?.commits, 2);

  const b = map.get('/repo/src/b.ts');
  assert.equal(b?.churn, 10);
  assert.equal(b?.delta, 10);
  assert.equal(b?.commits, 1);

  const binary = map.get('/repo/assets/logo.png');
  assert.equal(binary?.churn, 0);
  assert.equal(binary?.commits, 1);
});
