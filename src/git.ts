import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { Logger } from './logger';
import { isWithin } from './paths';
import { DateRange } from './config';
import { FileChurn, RawChange, parseNumstat, toFileChurnMap } from './parse';

const HEADER = '@@@';
const SEP = '\u001f';

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
      const records = parsed
        .map((record) => ({ ...record, path: path.resolve(repoRoot, record.path) }))
        .filter((record) => isWithin(this.rootPath, record.path));

      const files = toFileChurnMap(records, (filePath) => filePath);

      Logger.log(`Processed ${records.length} file changes across ${files.size} unique files.`);

      return { records, files, head };
    } catch (e) {
      Logger.error('Error fetching git history:', e);
      return { records: [], files: new Map(), head };
    }
  }

  async getFileHistory(range: DateRange): Promise<Map<string, FileChurn>> {
    return (await this.getChurnData(range)).files;
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
