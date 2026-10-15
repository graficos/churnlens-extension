import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { raw } = vi.hoisted(() => ({ raw: vi.fn() }));

vi.mock('simple-git', () => ({ default: () => ({ raw }) }));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({ appendLine: () => {}, show: () => {} }),
  },
}));

import { GitService } from './git';
import { matchesIgnored } from './paths';

const NUMSTAT =
  '@@@c1\u001fana\u001f2026-10-10T00:00:00Z\u001ffix: x\n' +
  '3\t1\tsrc/a.ts\n' +
  '5\t0\tdist/bundle.js\n';

function rawFor(checkIgnore: () => Promise<string>) {
  return async (args: string[]) => {
    if (args[0] === 'rev-parse' && args.includes('--show-toplevel')) return '/repo\n';
    if (args[0] === 'rev-parse' && args.includes('HEAD')) return 'head\n';
    if (args[0] === 'log') return NUMSTAT;
    if (args.includes('check-ignore')) return checkIgnore();
    return '';
  };
}

describe('GitService ignores', () => {
  beforeEach(() => {
    raw.mockReset();
  });

  it('drops records whose path is gitignored, even when tracked', async () => {
    raw.mockImplementation(rawFor(async () => 'dist/bundle.js\n'));

    const { records, files } = await new GitService('/repo').getChurnData({
      since: new Date('2026-10-01'),
      until: new Date('2026-10-31'),
      preset: '30d',
    });

    expect(records.map((record) => record.path)).toEqual(['/repo/src/a.ts']);
    expect([...files.keys()]).toEqual(['/repo/src/a.ts']);
    const ignoreCall = raw.mock.calls.find(([args]) => args.includes('check-ignore'))?.[0];
    expect(ignoreCall).toContain('--no-index');
  });

  it('keeps every record when check-ignore reports no matches', async () => {
    raw.mockImplementation(
      rawFor(async () => {
        throw new Error('exit 1');
      }),
    );

    const { records } = await new GitService('/repo').getChurnData({
      since: new Date('2026-10-01'),
      until: new Date('2026-10-31'),
      preset: '30d',
    });

    expect(records.map((record) => record.path)).toEqual([
      '/repo/src/a.ts',
      '/repo/dist/bundle.js',
    ]);
  });

  it('drops records matched by the user ignore list', async () => {
    raw.mockImplementation(
      rawFor(async () => {
        throw new Error('exit 1');
      }),
    );

    const { records, files } = await new GitService('/repo').getChurnData(
      { since: new Date('2026-10-01'), until: new Date('2026-10-31'), preset: '30d' },
      ['dist/bundle.js'],
    );

    expect(records.map((record) => record.path)).toEqual(['/repo/src/a.ts']);
    expect([...files.keys()]).toEqual(['/repo/src/a.ts']);
  });
});

describe('matchesIgnored', () => {
  it('matches exact files and anything under an ignored directory', () => {
    expect(matchesIgnored('src/a.ts', ['src/a.ts'])).toBe(true);
    expect(matchesIgnored('dist/bundle.js', ['dist'])).toBe(true);
    expect(matchesIgnored('src/a.ts', ['dist'])).toBe(false);
    expect(matchesIgnored('src/dist/a.ts', ['dist'])).toBe(false);
    expect(matchesIgnored('src/a.ts', [''])).toBe(false);
  });
});
