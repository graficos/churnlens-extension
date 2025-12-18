import * as path from 'path';

export class ChurnCalculator {
  // We now return the itemCounts map directly alongside levels so the provider can show specific counts
  static calculate(
    fileCounts: Map<string, number>,
    rootPath: string
  ): { levels: Map<string, number>; counts: Map<string, number> } {
    const levels = new Map<string, number>();
    const itemCounts = new Map<string, number>(fileCounts);

    // Aggregate counts for folders
    for (const [filePath, count] of fileCounts.entries()) {
      let currentDir = path.dirname(filePath);

      // Go up until we reach the root
      while (currentDir.startsWith(rootPath)) {
        itemCounts.set(currentDir, (itemCounts.get(currentDir) || 0) + count);

        if (currentDir === rootPath) break;

        const parent = path.dirname(currentDir);
        if (parent === currentDir) break;
        currentDir = parent;
      }
    }

    let max = 0;
    for (const count of itemCounts.values()) {
      if (count > max) max = count;
    }

    if (max === 0) {
      return { levels, counts: itemCounts };
    }

    for (const [item, count] of itemCounts.entries()) {
      // Simple linear normalization
      const normalized = count / max;
      // Map to 1-6 levels
      // If count is 0 (shouldn't be in map if from git log), level is 0
      const level = Math.ceil(normalized * 6);
      levels.set(item, level);
    }

    return { levels, counts: itemCounts };
  }
}
