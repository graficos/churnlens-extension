import * as vscode from 'vscode';
import * as path from 'path';
import { ChurnAggregate, ChurnCalculator, Metric } from '../churn';
import { ConfigManager } from '../config';
import { GitService } from '../git';
import { Logger } from '../logger';
import { isWithin } from '../paths';

interface FileNode {
  name: string;
  path: string;
  churn: number;
  delta: number;
  added: number;
  deleted: number;
  level: number;
  children?: { [key: string]: FileNode };
  isDir: boolean;
}

export class ChurnSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'churnlens.sidebar';
  private _view?: vscode.WebviewView;
  private _metric: Metric = 'churn';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly gitService: GitService
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'ready':
          this.refresh();
          break;
        case 'refresh':
          this.refresh();
          break;
        case 'openFile':
          this.openFile(data.path);
          break;
        case 'openSettings':
          vscode.commands.executeCommand('churnlens.openConfig');
          break;
        case 'openInfo':
          this.openInfo();
          break;
        case 'setPreset':
          this.updateSetting('rangePreset', data.value);
          break;
        case 'setCustomRange':
          this.setCustomRange(data.start, data.end);
          break;
        case 'setMetric':
          this._metric = data.value === 'delta' ? 'delta' : 'churn';
          this.refresh();
          break;
      }
    });
  }

  private openFile(filePath: string) {
    vscode.window.showTextDocument(vscode.Uri.file(filePath));
  }

  private openInfo() {
    const docUri = vscode.Uri.joinPath(
      this._extensionUri,
      'docs',
      'churn-and-delta.md'
    );
    vscode.window.showTextDocument(docUri, { preview: true });
  }

  private async updateSetting(key: string, value: unknown) {
    await vscode.workspace
      .getConfiguration('churnlens')
      .update(key, value, vscode.ConfigurationTarget.Global);
  }

  private async setCustomRange(start: string, end: string) {
    const config = vscode.workspace.getConfiguration('churnlens');
    await config.update('rangeStart', start, vscode.ConfigurationTarget.Global);
    await config.update('rangeEnd', end, vscode.ConfigurationTarget.Global);
    await config.update(
      'rangePreset',
      'custom',
      vscode.ConfigurationTarget.Global
    );
  }

  public async refresh() {
    if (!this._view) {
      return;
    }

    this._view.webview.postMessage({ type: 'loading' });

    const range = ConfigManager.getRange();
    const hideRoot = ConfigManager.getHideRoot();

    try {
      const files = await this.gitService.getFileHistory(range);
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

      const items = ChurnCalculator.aggregate(files, rootPath);
      const levels = ChurnCalculator.levels(items);

      const tree: FileNode = {
        name: 'root',
        path: rootPath,
        churn: 0,
        delta: 0,
        added: 0,
        deleted: 0,
        level: levels.get(rootPath) || 0,
        children: {},
        isDir: true,
      };

      for (const itemPath of items.keys()) {
        if (itemPath === rootPath || !isWithin(rootPath, itemPath)) {
          continue;
        }

        const relPath = itemPath.substring(rootPath.length + 1);
        const parts = relPath.split(path.sep);

        let currentNode = tree;
        let currentPath = rootPath;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath = path.join(currentPath, part);

          if (!currentNode.children) {
            currentNode.children = {};
          }

          if (!currentNode.children[part]) {
            const aggregate: ChurnAggregate | undefined = items.get(currentPath);
            currentNode.children[part] = {
              name: part,
              path: currentPath,
              churn: aggregate?.churn ?? 0,
              delta: aggregate?.delta ?? 0,
              added: aggregate?.added ?? 0,
              deleted: aggregate?.deleted ?? 0,
              level: levels.get(currentPath) || 0,
              children: {},
              isDir: !files.has(currentPath),
            };
          }
          currentNode = currentNode.children[part];
        }
      }

      const rootNodes = hideRoot ? Object.values(tree.children || {}) : [tree];
      const data = this.serialize(rootNodes);

      this._view.webview.postMessage({
        type: 'update',
        files: data,
        metric: this._metric,
        preset: range.preset,
        start: toDateInput(range.since),
        end: toDateInput(range.until),
      });
    } catch (e) {
      Logger.error('Error refreshing sidebar', e);
      this._view.webview.postMessage({ type: 'error' });
    }
  }

  private serialize(nodes: FileNode[]): any[] {
    return nodes
      .sort((a, b) => this.metricValue(b) - this.metricValue(a))
      .map((n) => ({
        name: n.name,
        path: n.path,
        churn: n.churn,
        delta: n.delta,
        added: n.added,
        deleted: n.deleted,
        level: n.level,
        isDir: n.isDir,
        children: n.children ? this.serialize(Object.values(n.children)) : [],
      }));
  }

  private metricValue(node: FileNode): number {
    return this._metric === 'delta' ? node.delta : node.churn;
  }

  private _getHtmlForWebview() {
    const codiconsUri = this._view?.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css'
      )
    );

    const preset = ConfigManager.getRange().preset;

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
              flex-direction: column;
              gap: 6px;
              border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
              font-size: 0.8rem;
            }
            .row {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .spacer {
              flex: 1;
            }
            select,
            input[type='date'] {
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border: 1px solid var(--vscode-input-border);
              padding: 2px 4px;
              outline: none;
              font-family: inherit;
              font-size: inherit;
            }
            select:focus,
            input[type='date']:focus {
              border-color: var(--vscode-focusBorder);
            }
            #custom {
              display: flex;
              gap: 4px;
            }
            [hidden] {
              display: none !important;
            }
            .info {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
              color: var(--vscode-textLink-foreground);
              border-bottom: 1px solid transparent;
              padding-bottom: 1px;
            }
            .info:hover {
              border-bottom-color: currentColor;
            }
            .actions button {
              background: none;
              border: none;
              color: var(--vscode-icon-foreground);
              cursor: pointer;
              font-size: 1rem;
              padding: 2px 4px;
              border-radius: 3px;
            }
            .actions button:hover {
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
            ul ul {
              padding-left: 10px;
              border-left: 1px solid var(--vscode-tree-indentGuidesStroke);
            }
            .level-1 { border-left: 3px solid #90ee90; }
            .level-2 { border-left: 3px solid #adff2f; }
            .level-3 { border-left: 3px solid #ffd700; }
            .level-4 { border-left: 3px solid #ffa500; }
            .level-5 { border-left: 3px solid #ff4500; }
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
            .spinner {
              width: 18px;
              height: 18px;
              border: 2px solid var(--vscode-foreground);
              border-top-color: transparent;
              border-radius: 50%;
              opacity: 0.6;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .loading {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div class="row">
              <span>Range</span>
              <select id="preset" onchange="onPresetChange()">
                <option value="2d">2 days</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="custom">Custom</option>
              </select>
              <span id="custom" hidden>
                <input type="date" id="range-start" onchange="onRangeChange()" />
                <input type="date" id="range-end" onchange="onRangeChange()" />
              </span>
            </div>
            <div class="row">
              <span>Metric</span>
              <select id="metric" onchange="onMetricChange()">
                <option value="churn">Churn</option>
                <option value="delta">Delta</option>
              </select>
              <span class="info" onclick="openInfo()" title="What are churn and delta?">
                <i class="codicon codicon-info"></i><span class="info-label">info</span>
              </span>
              <span class="spacer"></span>
              <span class="actions">
                <button title="Refresh" onclick="refresh()"><i class="codicon codicon-refresh"></i></button>
                <button title="Settings" onclick="openSettings()"><i class="codicon codicon-settings-gear"></i></button>
              </span>
            </div>
          </div>
          <div id="tree-root">
            <div class="loading"><span class="spinner"></span> Loading...</div>
          </div>

          <script>
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ type: 'ready' });

            function refresh() {
              vscode.postMessage({ type: 'refresh' });
            }
            function openSettings() {
              vscode.postMessage({ type: 'openSettings' });
            }
            function openInfo() {
              vscode.postMessage({ type: 'openInfo' });
            }
            function onPresetChange() {
              const value = document.getElementById('preset').value;
              toggleCustom();
              vscode.postMessage({ type: 'setPreset', value: value });
            }
            function onRangeChange() {
              const start = document.getElementById('range-start').value;
              const end = document.getElementById('range-end').value;
              vscode.postMessage({ type: 'setCustomRange', start: start, end: end });
            }
            function onMetricChange() {
              const value = document.getElementById('metric').value;
              vscode.postMessage({ type: 'setMetric', value: value });
            }
            function toggleCustom() {
              const isCustom =
                document.getElementById('preset').value === 'custom';
              document.getElementById('custom').hidden = !isCustom;
            }

            window.addEventListener('message', (event) => {
              const data = event.data;
              if (data.type === 'loading') {
                renderLoading();
                return;
              }
              if (data.type === 'update') {
                document.getElementById('preset').value = data.preset;
                document.getElementById('metric').value = data.metric;
                if (data.start) {
                  document.getElementById('range-start').value = data.start;
                }
                if (data.end) {
                  document.getElementById('range-end').value = data.end;
                }
                toggleCustom();
                renderTree(data.files, data.metric);
                return;
              }
              if (data.type === 'error') {
                document.getElementById('tree-root').innerHTML =
                  '<div style="padding:10px">Could not read git history.</div>';
              }
            });

            function renderLoading() {
              document.getElementById('tree-root').innerHTML =
                '<div class="loading"><span class="spinner"></span> Loading...</div>';
            }

            function formatValue(node, metric) {
              const value = metric === 'delta' ? node.delta : node.churn;
              if (metric === 'delta' && value > 0) return '+' + value;
              return String(value);
            }

            function renderTree(nodes, metric) {
              const root = document.getElementById('tree-root');
              root.innerHTML = '';
              if (!nodes || nodes.length === 0) {
                root.innerHTML =
                  '<div style="padding:10px">No churn data in this range. Try a longer period.</div>';
                return;
              }
              root.appendChild(createList(nodes, metric));
            }

            function getIconClass(name, isDir) {
              if (isDir) return 'codicon codicon-folder';
              if (/\\.(ts|js|jsx|tsx|json|xml|yml)$/.test(name))
                return 'codicon codicon-file-code';
              if (/\\.(md|txt)$/.test(name)) return 'codicon codicon-file-text';
              if (/\\.(png|jpg|jpeg|gif|svg)$/.test(name))
                return 'codicon codicon-file-media';
              if (/\\.(zip|tar|gz)$/.test(name)) return 'codicon codicon-file-zip';
              if (/\\.pdf$/.test(name)) return 'codicon codicon-file-pdf';
              return 'codicon codicon-file';
            }

            function createList(nodes, metric) {
              const ul = document.createElement('ul');
              nodes.forEach((node) => {
                const li = document.createElement('li');
                const contextValue = JSON.stringify({
                  webviewSection: 'fileItem',
                  path: node.path,
                });
                const value = formatValue(node, metric);

                if (node.isDir && node.children && node.children.length > 0) {
                  const details = document.createElement('details');
                  const summary = document.createElement('summary');
                  summary.className = 'node level level-' + node.level;
                  summary.setAttribute('data-vscode-context', contextValue);
                  summary.innerHTML =
                    '<span class="arrow">&#9654;</span> ' +
                    '<span class="icon codicon codicon-folder"></span> ' +
                    '<span class="name">' + escapeHtml(node.name) + '</span> ' +
                    '<span class="count">' + value + '</span>';
                  details.appendChild(summary);
                  details.appendChild(createList(node.children, metric));
                  li.appendChild(details);
                } else {
                  const a = document.createElement('a');
                  a.className = 'node level level-' + node.level;
                  a.href = '#';
                  a.setAttribute('data-vscode-context', contextValue);
                  a.innerHTML =
                    '<span class="arrow empty"></span> ' +
                    '<span class="icon ' + getIconClass(node.name, false) + '"></span> ' +
                    '<span class="name">' + escapeHtml(node.name) + '</span> ' +
                    '<span class="count">' + value + '</span>';
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

            function escapeHtml(text) {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            }
          </script>
        </body>
      </html>`;
  }
}

function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
