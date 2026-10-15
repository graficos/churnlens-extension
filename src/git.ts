import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { Logger } from './logger';
import { isWithin } from './paths';
import { DateRange } from './config';
import { FileChurn, RawChange, parseNumstat, toFileChurnMap } from './parse';
import { Boundary } from './series';

const HEADER = '@@@';
const SEP = '\u001f';
const ARG_CHUNK = 500;

export interface ChurnData {
  records: RawChange[];
  files: Map<string, FileChurn>;
  head: string;
}

export function formatGitDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export class GitService {
  private git: SimpleGit;
  private rootPath: string;
  private repoRoot?: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);
    Logger.log(`GitService initialized for root: ${rootPath}`);
  }

  async getRepoRoot(): Promise<string> {
    if (this.repoRoot) {
      return this.repoRoot;
    }
    try {
      const top = await this.git.raw(['rev-parse', '--show-toplevel']);
      this.repoRoot = top.trim() || this.rootPath;
    } catch (e) {
      Logger.error('Error resolving repo root', e);
      this.repoRoot = this.rootPath;
    }
    return this.repoRoot;
  }

  async getHead(): Promise<string> {
    try {
      return (await this.git.raw(['rev-parse', 'HEAD'])).trim();
    } catch (e) {
      Logger.error('Error resolving HEAD', e);
      return '';
    }
  }

  async getChurnData(range: DateRange): Promise<ChurnData> {
    const repoRoot = await this.getRepoRoot();
    const head = await this.getHead();
    const since = formatGitDate(range.since);
    const until = formatGitDate(range.until);

    Logger.log(`Fetching git churn from ${since} to ${until}`);

    try {
      const raw = await this.git.raw([
        'log',
        `--since=${since}`,
        `--until=${until}`,
        '--numstat',
        '--no-renames',
        `--pretty=format:${HEADER}%H${SEP}%an${SEP}%cI${SEP}%s`,
      ]);

      const parsed = parseNumstat(raw);
      const resolved = parsed
        .map((record) => ({ ...record, path: path.resolve(repoRoot, record.path) }))
        .filter((record) => isWithin(this.rootPath, record.path));
      const records = await this.excludeIgnored(resolved);

      const files = toFileChurnMap(records, (filePath) => filePath);

      Logger.log(`Processed ${records.length} file changes across ${files.size} unique files.`);

      return { records, files, head };
    } catch (e) {
      Logger.error('Error fetching git history:', e);
      return { records: [], files: new Map(), head };
    }
  }

  // Drop files matched by .gitignore. --no-index checks the patterns against the
  // path regardless of tracking, so committed-then-ignored files are removed too.
  private async excludeIgnored(records: RawChange[]): Promise<RawChange[]> {
    if (records.length === 0) {
      return records;
    }

    const toGitPath = (absPath: string) =>
      path.relative(this.rootPath, absPath).split(path.sep).join('/');
    const unique = [...new Set(records.map((record) => toGitPath(record.path)))];
    const ignored = new Set<string>();

    for (let i = 0; i < unique.length; i += ARG_CHUNK) {
      try {
        const out = await this.git.raw([
          '-c',
          'core.quotePath=false',
          'check-ignore',
          '--no-index',
          '--',
          ...unique.slice(i, i + ARG_CHUNK),
        ]);
        for (const entry of out.split('\n')) {
          if (entry) {
            ignored.add(entry);
          }
        }
      } catch {
        // check-ignore exits non-zero when nothing matches; nothing to collect.
      }
    }

    return ignored.size === 0
      ? records
      : records.filter((record) => !ignored.has(toGitPath(record.path)));
  }

  async getFileHistory(range: DateRange): Promise<Map<string, FileChurn>> {
    return (await this.getChurnData(range)).files;
  }

  async getBaselines(kind: 'tags' | 'merges'): Promise<Boundary[]> {
    try {
      const raw =
        kind === 'tags'
          ? await this.git.raw([
              'for-each-ref',
              '--sort=creatordate',
              '--format=%(refname:short) %(creatordate:iso-strict)',
              'refs/tags',
            ])
          : await this.git.raw(['log', '--merges', '--format=%cI%x1f%s']);

      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const splitAt = kind === 'tags' ? line.indexOf(' ') : line.indexOf(SEP);
          const first = splitAt < 0 ? line : line.slice(0, splitAt);
          const second = splitAt < 0 ? '' : line.slice(splitAt + 1);
          const [label, date] = kind === 'tags' ? [first, second] : [second.slice(0, 48), first];
          return { label: label || `point ${index}`, date: new Date(date) };
        })
        .filter((boundary) => !Number.isNaN(boundary.date.getTime()));
    } catch (e) {
      Logger.error('Error fetching baselines', e);
      return [];
    }
  }

  async getRemoteUrl(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');
      return origin ? origin.refs.fetch : '';
    } catch (e) {
      Logger.error('Error fetching remote url:', e);
      return '';
    }
  }
}
