import { describe, expect, it, vi } from 'vite-plus/test';

const { cfg } = vi.hoisted(() => ({ cfg: {} as Record<string, unknown> }));

vi.mock('vscode', () => ({
  EventEmitter: class<T> {
    private listeners: ((value: T) => void)[] = [];
    event = (listener: (value: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire(value: T) {
      for (const listener of this.listeners) listener(value);
    }
  },
  workspace: {
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => (key in cfg ? cfg[key] : fallback),
    }),
  },
}));

import { GitService } from './git';
import { ChurnStore } from './store';
import { RawChange } from './parse';

const record: RawChange = {
  commit: 'c1',
  author: 'a',
  date: '2026-10-10T00:00:00Z',
  subject: 'fix: x',
  added: 3,
  deleted: 1,
  path: '/repo/a.ts',
};

function fakeGit(tags: string[]): GitService {
  return {
    getHead: async () => 'head',
    getChurnData: async () => ({
      records: [record],
      files: new Map([
        [
          '/repo/a.ts',
          { path: '/repo/a.ts', added: 3, deleted: 1, churn: 4, delta: 2, commits: 1 },
        ],
      ]),
      head: 'head',
    }),
    getBaselines: async (kind: string) =>
      kind === 'tags' ? tags.map((label) => ({ label, date: new Date('2026-10-05') })) : [],
  } as unknown as GitService;
}

describe('ChurnStore grouping', () => {
  it('reports the resolved grouping and updates it with the baseline setting', async () => {
    const store = new ChurnStore(fakeGit(['v1', 'v2']), '/repo');
    store.setVisible(true);
    await new Promise((resolve) => setTimeout(resolve));
    expect(store.current.grouping).toBe('tags');

    cfg.baseline = 'time';
    await store.refresh();
    expect(store.current.grouping).toBe('time');
    expect(store.current.baseline).toBe('time');
  });

  it('falls back to time when the chosen baseline has too few boundaries', async () => {
    cfg.baseline = 'auto';
    const store = new ChurnStore(fakeGit(['v1']), '/repo');
    store.setVisible(true);
    await new Promise((resolve) => setTimeout(resolve));
    expect(store.current.grouping).toBe('time');
  });
});
