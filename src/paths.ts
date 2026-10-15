import * as path from 'path';

export function isWithin(root: string, candidate: string): boolean {
  if (candidate === root) {
    return true;
  }
  const withSeparator = root.endsWith(path.sep) ? root : root + path.sep;
  return candidate.startsWith(withSeparator);
}

// Match a workspace-relative, forward-slash path against user-ignored entries.
// A bare entry ignores the file itself; a directory entry ignores everything under it.
export function matchesIgnored(relPath: string, ignored: string[]): boolean {
  return ignored.some((entry) => {
    const trimmed = entry.replace(/\/+$/, '');
    return trimmed !== '' && (relPath === trimmed || relPath.startsWith(trimmed + '/'));
  });
}
