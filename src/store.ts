import * as vscode from 'vscode';
import { Metric } from './churn';
import { Baseline, ConfigManager } from './config';
import { ChurnData, GitService } from './git';
import { Logger } from './logger';
import { RawChange } from './parse';
import { Totals, ViewState } from './protocol';
import {
  Boundary,
  Granularity,
  TimeBucket,
  autoGranularity,
  bucketByBoundaries,
  bucketByTime,
  cumulative,
  groupByLabel,
  selectRecords,
  topRisk,
} from './series';
import { buildTree } from './tree';

const RISK_LIMIT = 15;

function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export class ChurnStore {
  private readonly _onDidChange = new vscode.EventEmitter<ViewState>();
  readonly onDidChange = this._onDidChange.event;

  private visibility = 0;
  private metric: Metric = 'churn';
  private selection: string | null = null;
  private state: ViewState;
  private cache?: { key: string; head: string; data: ChurnData };

  constructor(
    private readonly git: GitService,
    private readonly rootPath: string,
  ) {
    this.state = {
      status: 'idle',
      metric: this.metric,
      preset: '30d',
      start: '',
      end: '',
      selection: null,
      baseline: 'auto',
      totals: { added: 0, deleted: 0, churn: 0, delta: 0, commits: 0 },
      tree: [],
      series: [],
      cumulative: [],
      labels: [],
      risk: [],
    };
  }

  get current(): ViewState {
    return this.state;
  }

  setVisible(visible: boolean) {
    this.visibility = Math.max(0, this.visibility + (visible ? 1 : -1));
    if (visible && this.visibility === 1) {
      void this.refresh();
    }
  }

  setMetric(metric: Metric) {
    if (metric === this.metric) return;
    this.metric = metric;
    this.state = { ...this.state, metric };
    this._onDidChange.fire(this.state);
  }

  setSelection(path: string | null) {
    if (path === this.selection) {
      return;
    }
    this.selection = path;
    void this.refresh();
  }

  async refresh() {
    if (this.visibility <= 0) {
      return;
    }

    const range = ConfigManager.getRange();
    const hideRoot = ConfigManager.getHideRoot();
    const labels = ConfigManager.getCommitLabels();
    const baseline = ConfigManager.getBaseline();
    // Relative presets keep a stable key; a new commit (HEAD change) busts it.
    // ponytail: a commit ageing out of the window without a HEAD change stays
    // cached until the next commit or reload — fine for a read-only view.
    const key =
      range.preset === 'custom'
        ? `custom:${toDateInput(range.since)}:${toDateInput(range.until)}`
        : range.preset;

    this.state = { ...this.state, status: 'loading' };
    this._onDidChange.fire(this.state);

    try {
      const head = await this.git.getHead();
      let data: ChurnData;
      if (this.cache && this.cache.key === key && this.cache.head === head) {
        data = this.cache.data;
      } else {
        data = await this.git.getChurnData(range);
        this.cache = { key, head: data.head || head, data };
      }

      const scoped = selectRecords(data.records, this.rootPath, this.selection);
      const granularity = autoGranularity(range.since, range.until);
      const series = await this.seriesFor(scoped, baseline, granularity);

      this.state = {
        status: 'ready',
        metric: this.metric,
        preset: range.preset,
        start: toDateInput(range.since),
        end: toDateInput(range.until),
        selection: this.selection,
        baseline,
        totals: totalsOf(scoped),
        tree: buildTree(data.files, this.rootPath, hideRoot),
        series,
        cumulative: cumulative(series),
        labels: groupByLabel(scoped, labels),
        risk: topRisk(data.files, this.rootPath, RISK_LIMIT),
      };
      this._onDidChange.fire(this.state);
    } catch (e) {
      Logger.error('Error refreshing churn store', e);
      this.state = { ...this.state, status: 'error' };
      this._onDidChange.fire(this.state);
    }
  }

  private async seriesFor(
    records: RawChange[],
    baseline: Baseline,
    granularity: Granularity,
  ): Promise<TimeBucket[]> {
    if (baseline === 'time') {
      return bucketByTime(records, granularity);
    }

    const kind = baseline === 'auto' ? 'tags' : baseline;
    let boundaries: Boundary[] = await this.git.getBaselines(kind);
    if (baseline === 'auto' && boundaries.length < 2) {
      boundaries = await this.git.getBaselines('merges');
    }

    return boundaries.length >= 2
      ? bucketByBoundaries(records, boundaries)
      : bucketByTime(records, granularity);
  }
}

function totalsOf(records: { commit: string; added: number; deleted: number }[]): Totals {
  const commits = new Set<string>();
  let added = 0;
  let deleted = 0;
  for (const record of records) {
    added += record.added;
    deleted += record.deleted;
    commits.add(record.commit);
  }
  return {
    added,
    deleted,
    churn: added + deleted,
    delta: added - deleted,
    commits: commits.size,
  };
}
