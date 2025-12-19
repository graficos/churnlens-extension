import * as vscode from 'vscode';
import * as path from 'path';
import { ChurnCalculator } from '../churn';
import { ConfigManager } from '../config';
import { GitService } from '../git';
import { Logger } from '../logger';

interface FileNode {
  name: string;
  path: string;
  count: number;
  level: number;
  children?: { [key: string]: FileNode };
  isDir: boolean;
}

export class ChurnSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'churnlens.sidebar';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly gitService: GitService
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Listen for messages from the sidebar
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'refresh':
          this.refresh();
          break;
        case 'openFile':
          this.openFile(data.path);
          break;
        case 'openSettings':
          vscode.commands.executeCommand('churnlens.openConfig');
          break;
        case 'updatePeriod':
          this.updatePeriod(data.value);
          break;
      }
    });

    // Initial load
    this.refresh();
  }

  private openFile(filePath: string) {
    const openPath = vscode.Uri.file(filePath);
    vscode.window.showTextDocument(openPath);
  }

  private async updatePeriod(days: number) {
    await vscode.workspace
      .getConfiguration('churnlens')
      .update('periodDays', days, vscode.ConfigurationTarget.Global);
    // Refresh will be triggered by the configuration change listener in extension.ts
  }

  public async refresh() {
    if (!this._view) {
      return;
    }

    Logger.log('Refreshing Churn Sidebar...');
    const days = ConfigManager.getPeriodDays();
    // Access config directly as I haven't added getter to ConfigManager yet
    const hideRoot = vscode.workspace
      .getConfiguration('churnlens')
      .get('hideRoot', true);

    try {
      const rawFileCounts = await this.gitService.getFileHistory(days);

      let rootPath = '';
      if (vscode.workspace.workspaceFolders) {
        rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      }

      const { levels, counts } = ChurnCalculator.calculate(
        rawFileCounts,
        rootPath
      );

      // Build Tree
      const tree: FileNode = {
        name: 'root',
        path: rootPath,
        count: counts.get(rootPath) || 0,
        level: levels.get(rootPath) || 0,
        children: {},
        isDir: true,
      };

      // Populate tree
      for (const [filePath, count] of counts.entries()) {
        if (filePath === rootPath) continue; // Already at root

        // Make relative path
        if (!filePath.startsWith(rootPath)) continue;
        const relPath = filePath.substring(rootPath.length + 1);
        const parts = relPath.split(path.sep);

        let currentNode = tree;
        let currentPath = rootPath;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath = path.join(currentPath, part);

          if (!currentNode.children) currentNode.children = {};

          if (!currentNode.children[part]) {
            // Level/Count might be missing if ChurnCalculator didn't aggregate (it should have)
            // But ChurnCalculator aggregates ALL parents.
            const nodeCount = counts.get(currentPath) || 0;
            const nodeLevel = levels.get(currentPath) || 0;

            currentNode.children[part] = {
              name: part,
              path: currentPath,
              count: nodeCount,
              level: nodeLevel,
              children:
                i === parts.length - 1 && !rawFileCounts.has(currentPath)
                  ? {}
                  : undefined, // Heuristic: if it's in rawFileCounts, it's a file? No, raw could have folders? No git log --name-only is files.
              // If rawFileCounts has it, it is a file.
              isDir: !rawFileCounts.has(currentPath),
            };
          }
          currentNode = currentNode.children[part];
        }
      }

      // If hideRoot is true, we send the children of root as the top level list
      let rootNodes: FileNode[] = [];
      if (hideRoot && tree.children) {
        rootNodes = Object.values(tree.children);
      } else {
        rootNodes = [tree];
      }

      // Sort? Folders first? High Churn first?
      // Let's sort by Churn Count Descending
      const sortNodes = (nodes: FileNode[]) => {
        nodes.sort((a, b) => b.count - a.count);
        nodes.forEach((n) => {
          if (n.children) {
            sortNodes(Object.values(n.children)); // Just sorting the array we'd create?
            // Wait, children is object. We need to convert to array for transport or let JS handle it.
            // Let's recursively convert children map to sorted array properly for the view
          }
        });
      };

      // We need a proper recursive structure for JSON transport
      const serialize = (nodes: FileNode[]): any[] => {
        return nodes
          .sort((a, b) => b.count - a.count)
          .map((n) => ({
            name: n.name,
            path: n.path,
            count: n.count,
            level: n.level,
            isDir: n.isDir,
            children: n.children ? serialize(Object.values(n.children)) : [],
          }));
      };

      const data = serialize(rootNodes);

      this._view.webview.postMessage({ type: 'update', files: data });
    } catch (e) {
      Logger.error('Error refreshing sidebar', e);
    }
  }

  private _getHtmlForWebview() {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    // We also need the codicons CSS
    const codiconsUri = this._view?.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css'
      )
    );

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Churn Explorer</title>
          <link href="${codiconsUri}" rel="stylesheet" />
          <style>
            body {
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
              padding: 0;
              margin: 0;
              color: var(--vscode-foreground);
              background-color: var(--vscode-sideBar-background);
            }
            .toolbar {
              padding: 6px 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
              font-size: 0.8rem;
            }
            .period-container {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            input[type=number] {
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border: 1px solid var(--vscode-input-border);
              width: 40px;
              padding: 2px 4px;
              outline: none;
            }
            input[type=number]:focus {
              border-color: var(--vscode-focusBorder);
            }
            .actions {
              display: flex;
              gap: 4px;
            }
            .toolbar button {
              background: none;
              border: none;
              color: var(--vscode-icon-foreground);
              cursor: pointer;
              font-size: 1rem;
              padding: 2px 4px;
              border-radius: 3px;
            }
            .toolbar button:hover {
              background-color: var(--vscode-button-hoverBackground);
            }

            #tree-root {
              padding: 10px;
            }

            ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            li {
              margin: 0;
              padding: 0;
            }

            .node {
              display: flex;
              justify-content: space-between;
              padding: 4px 8px;
              cursor: pointer;
              border-bottom: 1px solid var(--vscode-tree-tableODdRowsBackground);
              align-items: center;
              text-decoration: none;
              color: inherit;
            }
            .node:hover {
              background-color: var(--vscode-list-hoverBackground);
            }

            /* Indentation guide? No, just nested lists */
            ul ul {
              padding-left: 10px;
              border-left: 1px solid var(--vscode-tree-indentGuidesStroke);
            }

            /* Churn Levels (Left Border) for the ROW */
            .level-1 {
              border-left: 3px solid #90ee90;
            }
            .level-2 {
              border-left: 3px solid #adff2f;
            }
            .level-3 {
              border-left: 3px solid #ffd700;
            }
            .level-4 {
              border-left: 3px solid #ffa500;
            }
            .level-5 {
              border-left: 3px solid #ff4500;
            }
            .level-6 {
              border-left: 3px solid #ff0000;
              background-color: rgba(255, 0, 0, 0.1);
            }

            .icon {
              margin-right: 5px;
              font-size: 16px;
              vertical-align: middle;
            }
            .name {
              flex: 1;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            .count {
              font-size: 0.8em;
              opacity: 0.7;
            }

            details > summary {
              list-style: none;
            }
            details > summary::-webkit-details-marker {
              display: none;
            }

            /* Arrow */
            .arrow {
              display: inline-block;
              width: 16px;
              text-align: center;
              font-size: 0.8em;
              transition: transform 0.1s;
            }
            details[open] > summary .arrow {
              transform: rotate(90deg);
            }
            .arrow.empty {
              opacity: 0;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div class="period-container">
              Period: <input type="number" id="period-input" value="${ConfigManager.getPeriodDays()}" min="1" onchange="updatePeriod()" onblur="updatePeriod()" /> days
            </div>
            <div class="actions">
              <button title="Refresh" onclick="refresh()">🔃</button>
              <button title="Settings" onclick="openSettings()">⚙️</button>
            </div>
          </div>
          <div id="tree-root">Loading...</div>

          <script>
            const vscode = acquireVsCodeApi();

            function refresh() {
              vscode.postMessage({ type: 'refresh' });
            }

            function openSettings() {
              vscode.postMessage({ type: 'openSettings' });
            }

            function updatePeriod() {
              const val = document.getElementById('period-input').value;
              vscode.postMessage({ type: 'updatePeriod', value: parseInt(val) });
            }

            window.addEventListener('message', (event) => {
              if (event.data.type === 'update') {
                renderTree(event.data.files);
              }
            });

            function renderTree(nodes) {
              const root = document.getElementById('tree-root');
              root.innerHTML = '';
              if (nodes.length === 0) {
                root.innerHTML =
                  '<div style="padding:10px">No churn data.</div>';
                return;
              }
              root.appendChild(createList(nodes));
            }

            function getIconClass(name, isDir) {
              if (isDir) return 'codicon codicon-folder';
              if (
                name.endsWith('.ts') ||
                name.endsWith('.js') ||
                name.endsWith('.jsx') ||
                name.endsWith('.tsx')
              )
                return 'codicon codicon-file-code';
              if (
                name.endsWith('.json') ||
                name.endsWith('.xml') ||
                name.endsWith('.yml')
              )
                return 'codicon codicon-file-code'; // No specific JSON icon in basic set?
              if (name.endsWith('.md') || name.endsWith('.txt'))
                return 'codicon codicon-file-text';
              if (
                name.endsWith('.png') ||
                name.endsWith('.jpg') ||
                name.endsWith('.svg')
              )
                return 'codicon codicon-file-media';
              if (name.endsWith('.zip') || name.endsWith('.tar'))
                return 'codicon codicon-file-zip';
              if (name.endsWith('.pdf')) return 'codicon codicon-file-pdf';
              return 'codicon codicon-file';
            }

            function createList(nodes) {
              const ul = document.createElement('ul');
              nodes.forEach((node) => {
                const li = document.createElement('li');

                // Content Row
                // Using details/summary for folders
                if (node.isDir && node.children && node.children.length > 0) {
                  const details = document.createElement('details');
                  // details.open = true; // Auto expand high churn? Or all? Maybe too noisy.

                  const summary = document.createElement('summary');
                  summary.className = 'node level level-' + node.level;

                  summary.innerHTML = \`<span class="arrow">▶</span> <span class="icon codicon codicon-folder"></span> <span class="name">\${node.name}</span> <span class="count">\${node.count}</span>\`;

                  details.appendChild(summary);
                  details.appendChild(createList(node.children)); // Recursion
                  li.appendChild(details);
                } else {
                  // File
                  const a = document.createElement('a');
                  a.className = 'node level level-' + node.level;
                  a.href = '#';
                  const iconClass = getIconClass(node.name, false);
                  a.innerHTML = \`<span class="arrow empty"></span> <span class="icon \${iconClass}"></span> <span class="name">\${node.name}</span> <span class="count">\${node.count}</span>\`;
                  a.onclick = (e) => {
                    e.preventDefault();
                    vscode.postMessage({ type: 'openFile', path: node.path });
                  };
                  li.appendChild(a);
                }
                ul.appendChild(li);
              });
              return ul;
            }
          </script>
        </body>
      </html>`;
  }
}
