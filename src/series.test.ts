import { describe, expect, it } from 'vite-plus/test';
import { RawChange } from './parse';
import {
  Boundary,
  autoGranularity,
  bucketByBoundaries,
  bucketByTime,
  commitType,
  cumulative,
  deletionRatio,
  groupByLabel,
  topRisk,
} from './series';

function raw(
  date: string,
  subject: string,
  added: number,
  deleted: number,
  commit = date + subject,
  path = '/repo/src/a.ts',
): RawChange {
  return { commit, author: 'A', date, subject, added, deleted, path };
}

describe('commitType', () => {
  it('parses conventional commit types', () => {
    expect(commitType('feat: init')).toBe('feat');
    expect(commitType('fix(scope): bug')).toBe('fix');
    expect(commitType('feat(scope)!: breaking')).toBe('feat');
    expect(commitType('chore(deps): quiet')).toBe('chore');
  });

  it('falls back to other for free-form subjects', () => {
    expect(commitType('Merge branch main')).toBe('other');
    expect(commitType('update stuff')).toBe('other');
  });
});

describe('bucketByTime', () => {
  it('sums records into day buckets, sorted', () => {
    const records = [
      raw('2026-01-02T10:00:00Z', 'feat: a', 3, 0),
      raw('2026-01-02T18:00:00Z', 'fix: b', 0, 5),
      raw('2026-01-05T09:00:00Z', 'feat: c', 10, 0),
    ];
    const buckets = bucketByTime(records, 'day');
    expect(buckets.map((b) => b.key)).toEqual(['2026-01-02', '2026-01-05']);
    expect(buckets[0].added).toBe(3);
    expect(buckets[0].deleted).toBe(5);
    expect(buckets[0].churn).toBe(8);
    expect(buckets[0].delta).toBe(-2);
    expect(buckets[0].commits).toBe(2);
    expect(buckets[1].churn).toBe(10);
  });

  it('groups a week under its Monday and a month under YYYY-MM', () => {
    const records = [raw('2026-01-08T00:00:00Z', 'feat: a', 1, 0)];
    expect(bucketByTime(records, 'week')[0].key).toBe('2026-01-05');
    expect(bucketByTime(records, 'month')[0].key).toBe('2026-01');
  });

  it('skips unparseable dates', () => {
    expect(bucketByTime([raw('not-a-date', 'feat: x', 1, 0)], 'day')).toEqual([]);
  });
});

describe('bucketByBoundaries', () => {
  it('assigns records to the span after the latest boundary', () => {
    const records = [
      raw('2026-01-01T00:00:00Z', 'feat: a', 1, 0, 'c1'),
      raw('2026-02-15T00:00:00Z', 'feat: b', 2, 0, 'c2'),
      raw('2026-03-20T00:00:00Z', 'feat: c', 3, 0, 'c3'),
    ];
    const boundaries: Boundary[] = [
      { label: 'v1', date: new Date('2026-02-01T00:00:00Z') },
      { label: 'v2', date: new Date('2026-03-01T00:00:00Z') },
    ];
    const buckets = bucketByBoundaries(records, boundaries);
    expect(buckets.map((b) => b.label)).toEqual(['before', 'v1', 'v2']);
    expect(buckets.map((b) => b.churn)).toEqual([1, 2, 3]);
  });
});

describe('cumulative and deletionRatio', () => {
  it('accumulates churn and computes deleted/added', () => {
    const points = bucketByTime(
      [raw('2026-01-01T00:00:00Z', 'feat: a', 10, 0), raw('2026-01-02T00:00:00Z', 'fix: b', 0, 4)],
      'day',
    );
    expect(cumulative(points)).toEqual([10, 14]);
    expect(deletionRatio(points[0])).toBe(0);
    expect(deletionRatio(points[1])).toBe(1);
  });
});

describe('groupByLabel', () => {
  it('groups known types and folds the rest into other, sorted by churn', () => {
    const records = [
      raw('2026-01-01T00:00:00Z', 'feat: a', 100, 0),
      raw('2026-01-01T00:00:00Z', 'fix: b', 10, 5, 'c2'),
      raw('2026-01-01T00:00:00Z', 'wip: c', 7, 0, 'c3'),
    ];
    const groups = groupByLabel(records, ['feat', 'fix']);
    expect(groups.map((g) => g.type)).toEqual(['feat', 'fix', 'other']);
    expect(groups[2].churn).toBe(7);
  });
});

describe('topRisk', () => {
  it('orders files by churn and strips the root prefix', () => {
    const files = new Map([
      [
        '/repo/src/a.ts',
        { path: '/repo/src/a.ts', added: 1, deleted: 1, churn: 2, delta: 0, commits: 1 },
      ],
      [
        '/repo/src/b.ts',
        { path: '/repo/src/b.ts', added: 9, deleted: 0, churn: 9, delta: 9, commits: 1 },
      ],
    ]);
    const risk = topRisk(files, '/repo', 1);
    expect(risk).toEqual([{ path: '/repo/src/b.ts', name: 'src/b.ts', churn: 9, delta: 9 }]);
  });
});

describe('autoGranularity', () => {
  it('picks a granularity from the span width', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const at = (days: number) => new Date(base.getTime() + days * 86_400_000);
    expect(autoGranularity(base, at(7))).toBe('day');
    expect(autoGranularity(base, at(60))).toBe('week');
    expect(autoGranularity(base, at(400))).toBe('month');
  });
});
