import * as path from 'path';
import { FileChurn } from './parse';
import { isWithin } from './paths';

export interface ChurnAggregate {
  added: number;
  deleted: number;
  churn: number;
  delta: number;
  commits: number;
}

export type Metric = 'churn' | 'delta';

export class ChurnCalculator {
  static aggregate(
    files: Map<string, FileChurn>,
    rootPath: string
  ): Map<string, ChurnAggregate> {
    const items = new Map<string, ChurnAggregate>();

    const getOrCreate = (key: string): ChurnAggregate => {
      let entry = items.get(key);
      if (!entry) {
        entry = { added: 0, deleted: 0, churn: 0, delta: 0, commits: 0 };
        items.set(key, entry);
      }
      return entry;
    };

    const addInto = (target: ChurnAggregate, source: FileChurn) => {
      target.added += source.added;
      target.deleted += source.deleted;
      target.churn += source.churn;
      target.delta += source.delta;
      target.commits += source.commits;
    };

    for (const [filePath, file] of files) {
      addInto(getOrCreate(filePath), file);

      let dir = path.dirname(filePath);
      while (isWithin(rootPath, dir)) {
        addInto(getOrCreate(dir), file);
        if (dir === rootPath) {
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
          break;
        }
        dir = parent;
      }
    }

    return items;
  }

  static levels(items: Map<string, ChurnAggregate>): Map<string, number> {
    let max = 0;
    for (const item of items.values()) {
      if (item.churn > max) {
        max = item.churn;
      }
    }

    const levels = new Map<string, number>();
    if (max === 0) {
      return levels;
    }

    for (const [key, item] of items) {
      const normalized = item.churn / max;
      levels.set(key, Math.min(6, Math.max(1, Math.ceil(normalized * 6))));
    }

    return levels;
  }
}
