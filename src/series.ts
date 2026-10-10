import { FileChurn, RawChange } from './parse';
import { Metric } from './churn';
import { isWithin } from './paths';

export type Granularity = 'day' | 'week' | 'month';

export interface TimeBucket {
  key: string;
  label: string;
  added: number;
  deleted: number;
  churn: number;
  delta: number;
  commits: number;
}

export interface LabelBucket {
  type: string;
  added: number;
  deleted: number;
  churn: number;
  delta: number;
  commits: number;
}

export interface RiskEntry {
  path: string;
  name: string;
  churn: number;
  delta: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function weekKey(date: Date): string {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return dayKey(monday);
}

function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === 'day') return dayKey(date);
  if (granularity === 'month') return monthKey(date);
  return weekKey(date);
}

export function autoGranularity(since: Date, until: Date): Granularity {
  const days = Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000));
  if (days <= 14) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

export function selectRecords(
  records: RawChange[],
  rootPath: string,
  selection: string | null,
): RawChange[] {
  if (!selection) return records;
  return records.filter((record) => isWithin(selection, record.path));
}

export function bucketByTime(records: RawChange[], granularity: Granularity): TimeBucket[] {
  const buckets = new Map<string, TimeBucket & { commitSet: Set<string> }>();

  for (const record of records) {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) continue;

    const key = bucketKey(date, granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: key,
        added: 0,
        deleted: 0,
        churn: 0,
        delta: 0,
        commits: 0,
        commitSet: new Set(),
      };
      buckets.set(key, bucket);
    }

    bucket.added += record.added;
    bucket.deleted += record.deleted;
    bucket.churn += record.added + record.deleted;
    bucket.delta += record.added - record.deleted;
    bucket.commitSet.add(record.commit);
  }

  return [...buckets.values()]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ commitSet, ...bucket }) => ({ ...bucket, commits: commitSet.size }));
}

export function cumulative(points: TimeBucket[]): number[] {
  let running = 0;
  return points.map((point) => (running += point.churn));
}

export function deletionRatio(point: TimeBucket): number {
  if (point.added === 0) return point.deleted === 0 ? 0 : 1;
  return point.deleted / point.added;
}

const COMMIT_TYPE = /^(\w+)(?:\([^)]*\))?!?:/;

export function commitType(subject: string): string {
  const match = COMMIT_TYPE.exec(subject.trim());
  return match ? match[1] : 'other';
}

export function groupByLabel(records: RawChange[], labels: string[]): LabelBucket[] {
  const known = new Set(labels);
  const buckets = new Map<string, LabelBucket & { commitSet: Set<string> }>();

  for (const record of records) {
    const parsed = commitType(record.subject);
    const type = known.has(parsed) ? parsed : 'other';

    let bucket = buckets.get(type);
    if (!bucket) {
      bucket = { type, added: 0, deleted: 0, churn: 0, delta: 0, commits: 0, commitSet: new Set() };
      buckets.set(type, bucket);
    }

    bucket.added += record.added;
    bucket.deleted += record.deleted;
    bucket.churn += record.added + record.deleted;
    bucket.delta += record.added - record.deleted;
    bucket.commitSet.add(record.commit);
  }

  return [...buckets.values()]
    .sort((a, b) => b.churn - a.churn)
    .map(({ commitSet, ...bucket }) => ({ ...bucket, commits: commitSet.size }));
}

export function topRisk(
  files: Map<string, FileChurn>,
  rootPath: string,
  limit: number,
): RiskEntry[] {
  return [...files.values()]
    .sort((a, b) => b.churn - a.churn)
    .slice(0, limit)
    .map((file) => ({
      path: file.path,
      name: file.path.startsWith(rootPath) ? file.path.slice(rootPath.length + 1) : file.path,
      churn: file.churn,
      delta: file.delta,
    }));
}

export function metricValue(entry: { churn: number; delta: number }, metric: Metric): number {
  return metric === 'delta' ? entry.delta : entry.churn;
}
