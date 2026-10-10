import * as path from 'path';
import { ChurnAggregate, ChurnCalculator } from './churn';
import { FileChurn } from './parse';
import { isWithin } from './paths';

export interface TreeNode {
  name: string;
  path: string;
  churn: number;
  delta: number;
  added: number;
  deleted: number;
  level: number;
  isDir: boolean;
  children: TreeNode[];
}

interface MutableNode extends Omit<TreeNode, 'children'> {
  children: Record<string, MutableNode>;
}

export function buildTree(
  files: Map<string, FileChurn>,
  rootPath: string,
  hideRoot: boolean,
): TreeNode[] {
  const items = ChurnCalculator.aggregate(files, rootPath);
  const levels = ChurnCalculator.levels(items);

  const root: MutableNode = {
    name: 'root',
    path: rootPath,
    churn: 0,
    delta: 0,
    added: 0,
    deleted: 0,
    level: levels.get(rootPath) || 0,
    isDir: true,
    children: {},
  };

  for (const itemPath of items.keys()) {
    if (itemPath === rootPath || !isWithin(rootPath, itemPath)) {
      continue;
    }

    const parts = itemPath.substring(rootPath.length + 1).split(path.sep);
    let node = root;
    let currentPath = rootPath;

    for (const part of parts) {
      currentPath = path.join(currentPath, part);
      if (!node.children[part]) {
        const aggregate: ChurnAggregate | undefined = items.get(currentPath);
        node.children[part] = {
          name: part,
          path: currentPath,
          churn: aggregate?.churn ?? 0,
          delta: aggregate?.delta ?? 0,
          added: aggregate?.added ?? 0,
          deleted: aggregate?.deleted ?? 0,
          level: levels.get(currentPath) || 0,
          isDir: !files.has(currentPath),
          children: {},
        };
      }
      node = node.children[part];
    }
  }

  const roots = hideRoot ? Object.values(root.children) : [root];
  return roots.map(serialize);
}

function serialize(node: MutableNode): TreeNode {
  const children = Object.values(node.children)
    .map(serialize)
    .sort((a, b) => b.churn - a.churn);
  return {
    name: node.name,
    path: node.path,
    churn: node.churn,
    delta: node.delta,
    added: node.added,
    deleted: node.deleted,
    level: node.level,
    isDir: node.isDir,
    children,
  };
}
