import * as vscode from 'vscode';

export type RangePreset = '2d' | '3d' | '7d' | '30d' | 'custom';

export interface DateRange {
  since: Date;
  until: Date;
  preset: RangePreset;
}

const PRESET_DAYS: Record<string, number> = {
  '2d': 2,
  '3d': 3,
  '7d': 7,
  '30d': 30,
};

function addDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

function parseLocalDate(value: string, endOfDay: boolean): Date {
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

export class ConfigManager {
  static getRange(): DateRange {
    const config = vscode.workspace.getConfiguration('churnlens');
    const preset = config.get<RangePreset>('rangePreset', '30d');
    const now = new Date();

    if (preset === 'custom') {
      const start = config.get<string>('rangeStart', '');
      const end = config.get<string>('rangeEnd', '');
      return {
        since: start ? parseLocalDate(start, false) : addDays(now, -30),
        until: end ? parseLocalDate(end, true) : now,
        preset,
      };
    }

    const days = PRESET_DAYS[preset] ?? 30;
    return { since: addDays(now, -days), until: now, preset };
  }

  static getCommitLabels(): string[] {
    const raw = vscode.workspace
      .getConfiguration('churnlens')
      .get<string>(
        'commitLabels',
        'feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert'
      );
    return raw
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
  }

  static getHideRoot(): boolean {
    return vscode.workspace.getConfiguration('churnlens').get('hideRoot', true);
  }
}
