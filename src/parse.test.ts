import { describe, expect, it } from 'vite-plus/test';
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

describe('parseNumstat', () => {
  it('parses records and treats binary as zero', () => {
    const records = parseNumstat(RAW);
    expect(records.length).toBe(4);

    const binary = records.find((r) => r.path === 'assets/logo.png');
    expect(binary).toBeTruthy();
    expect(binary?.added).toBe(0);
    expect(binary?.deleted).toBe(0);

    const withSpaces = records.find((r) => r.subject === 'fix: edit a');
    expect(withSpaces).toBeTruthy();
  });

  it('aggregates churn and delta per file and counts commits', () => {
    const map = toFileChurnMap(parseNumstat(RAW), (p) => '/repo/' + p);

    const a = map.get('/repo/src/a.ts');
    expect(a).toBeTruthy();
    expect(a?.added).toBe(3);
    expect(a?.deleted).toBe(5);
    expect(a?.churn).toBe(8);
    expect(a?.delta).toBe(-2);
    expect(a?.commits).toBe(2);

    const b = map.get('/repo/src/b.ts');
    expect(b?.churn).toBe(10);
    expect(b?.delta).toBe(10);
    expect(b?.commits).toBe(1);

    const binary = map.get('/repo/assets/logo.png');
    expect(binary?.churn).toBe(0);
    expect(binary?.commits).toBe(1);
  });
});
