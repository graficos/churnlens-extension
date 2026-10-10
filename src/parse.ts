export interface RawChange {
  commit: string;
  author: string;
  date: string;
  subject: string;
  added: number;
  deleted: number;
  path: string;
}

export interface FileChurn {
  path: string;
  added: number;
  deleted: number;
  churn: number;
  delta: number;
  commits: number;
}

const HEADER = '@@@';
const SEP = '\u001f';

export function parseNumstat(raw: string): RawChange[] {
  const records: RawChange[] = [];
  let current: { commit: string; author: string; date: string; subject: string } | undefined;

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line) {
      continue;
    }

    if (line.startsWith(HEADER)) {
      const [commit, author, date, ...subjectParts] = line.slice(HEADER.length).split(SEP);
      current = {
        commit: commit || '',
        author: author || '',
        date: date || '',
        subject: subjectParts.join(SEP),
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const firstTab = line.indexOf('\t');
    const secondTab = line.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0) {
      continue;
    }

    const addedRaw = line.slice(0, firstTab);
    const deletedRaw = line.slice(firstTab + 1, secondTab);
    const filePath = line.slice(secondTab + 1);

    records.push({
      commit: current.commit,
      author: current.author,
      date: current.date,
      subject: current.subject,
      added: addedRaw === '-' ? 0 : parseInt(addedRaw, 10) || 0,
      deleted: deletedRaw === '-' ? 0 : parseInt(deletedRaw, 10) || 0,
      path: filePath,
    });
  }

  return records;
}

export function toFileChurnMap(
  records: RawChange[],
  toAbsolute: (path: string) => string,
): Map<string, FileChurn> {
  const map = new Map<string, FileChurn>();
  const commitsPerFile = new Map<string, Set<string>>();

  for (const record of records) {
    const absPath = toAbsolute(record.path);

    let entry = map.get(absPath);
    if (!entry) {
      entry = {
        path: absPath,
        added: 0,
        deleted: 0,
        churn: 0,
        delta: 0,
        commits: 0,
      };
      map.set(absPath, entry);
    }
    entry.added += record.added;
    entry.deleted += record.deleted;
    entry.churn = entry.added + entry.deleted;
    entry.delta = entry.added - entry.deleted;

    let seen = commitsPerFile.get(absPath);
    if (!seen) {
      seen = new Set<string>();
      commitsPerFile.set(absPath, seen);
    }
    seen.add(record.commit);
  }

  for (const [absPath, seen] of commitsPerFile) {
    const entry = map.get(absPath);
    if (entry) {
      entry.commits = seen.size;
    }
  }

  return map;
}
