import * as vscode from 'vscode';
import { ConfigManager, RangePreset } from '../config';

interface ConfigPayload {
  preset: RangePreset;
  start: string;
  end: string;
  hideRoot: boolean;
  commitLabels: string;
}

export class ConfigPanel {
  public static currentPanel: ConfigPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ConfigPanel.currentPanel) {
      ConfigPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'churnlensConfig',
      'ChurnLens Configuration',
      column || vscode.ViewColumn.One,
      { enableScripts: true }
    );

    ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'save') {
          await this._save(message.value as ConfigPayload);
          vscode.window.showInformationMessage('ChurnLens: Settings saved.');
        }
      },
      null,
      this._disposables
    );
  }

  private async _save(payload: ConfigPayload) {
    const config = vscode.workspace.getConfiguration('churnlens');
    const target = vscode.ConfigurationTarget.Global;
    await config.update('rangePreset', payload.preset, target);
    await config.update('rangeStart', payload.start, target);
    await config.update('rangeEnd', payload.end, target);
    await config.update('hideRoot', payload.hideRoot, target);
    await config.update('commitLabels', payload.commitLabels, target);
  }

  public dispose() {
    ConfigPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  private _getHtmlForWebview() {
    const config = vscode.workspace.getConfiguration('churnlens');
    const preset = config.get<string>('rangePreset', '30d');
    const start = config.get<string>('rangeStart', '');
    const end = config.get<string>('rangeEnd', '');
    const hideRoot = config.get<boolean>('hideRoot', true);
    const commitLabels = ConfigManager.getCommitLabels().join(', ');

    return String.raw`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>ChurnLens Configuration</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              padding: 20px;
              color: var(--vscode-editor-foreground);
              background-color: var(--vscode-editor-background);
              max-width: 640px;
            }
            .setting { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; }
            input, select {
              padding: 5px;
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border: 1px solid var(--vscode-input-border);
              font-family: inherit;
            }
            input[type='text'] { width: 100%; box-sizing: border-box; }
            button {
              padding: 8px 16px;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              cursor: pointer;
            }
            button:hover { background: var(--vscode-button-hoverBackground); }
            .hint { opacity: 0.7; font-size: 0.85em; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h1>ChurnLens Configuration</h1>

          <div class="setting">
            <label for="preset">Range preset</label>
            <select id="preset">
              <option value="2d">2 days</option>
              <option value="3d">3 days</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div class="setting">
            <label for="start">Custom range (used when preset is "Custom")</label>
            <input type="date" id="start" value="${start}" />
            <input type="date" id="end" value="${end}" />
          </div>

          <div class="setting">
            <label for="hideRoot">
              <input type="checkbox" id="hideRoot" ${hideRoot ? 'checked' : ''} />
              Hide the root project folder
            </label>
          </div>

          <div class="setting">
            <label for="commitLabels">Commit labels (comma separated)</label>
            <input type="text" id="commitLabels" value="${commitLabels}" />
            <div class="hint">
              Used to group churn by Conventional Commit type. Default follows the
              Angular convention.
            </div>
          </div>

          <button onclick="save()">Save</button>

          <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('preset').value = '${preset}';
            function save() {
              vscode.postMessage({
                command: 'save',
                value: {
                  preset: document.getElementById('preset').value,
                  start: document.getElementById('start').value,
                  end: document.getElementById('end').value,
                  hideRoot: document.getElementById('hideRoot').checked,
                  commitLabels: document.getElementById('commitLabels').value,
                },
              });
            }
          </script>
        </body>
      </html>`;
  }
}
