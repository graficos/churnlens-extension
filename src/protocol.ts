import type { Metric } from './churn';
import type { Baseline, RangePreset } from './config';
import type { TreeNode } from './tree';
import type { LabelBucket, RiskEntry, TimeBucket } from './series';

export type { Baseline, Metric, RangePreset };

export interface Totals {
  added: number;
  deleted: number;
  churn: number;
  delta: number;
  commits: number;
}

export interface ViewState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  metric: Metric;
  preset: RangePreset;
  start: string;
  end: string;
  selection: string | null;
  baseline: Baseline;
  totals: Totals;
  tree: TreeNode[];
  series: TimeBucket[];
  cumulative: number[];
  labels: LabelBucket[];
  risk: RiskEntry[];
}

export type WebToExt =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'setRange'; preset: RangePreset; start?: string; end?: string }
  | { type: 'setMetric'; value: Metric }
  | { type: 'setBaseline'; value: Baseline }
  | { type: 'select'; path: string | null }
  | { type: 'openFile'; path: string }
  | { type: 'openInfo' }
  | { type: 'openSettings' }
  | { type: 'openTrend' };

export type ExtToWeb = { type: 'state'; state: ViewState };
