import * as path from 'path';

export function isWithin(root: string, candidate: string): boolean {
  if (candidate === root) {
    return true;
  }
  const withSeparator = root.endsWith(path.sep) ? root : root + path.sep;
  return candidate.startsWith(withSeparator);
}
