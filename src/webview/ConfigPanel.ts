import * as vscode from 'vscode';
import { ConfigManager } from '../config';

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
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'updatePeriod':
            vscode.workspace
              .getConfiguration('churnlens')
              .update(
                'periodDays',
                message.value,
                vscode.ConfigurationTarget.Global
              );
            vscode.window.showInformationMessage(
              `ChurnLens: Period updated to ${message.value} days`
            );
            return;
        }
      },
      null,
      this._disposables
    );

    // Listen for configuration changes to sync the Webview
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration('churnlens.periodDays')) {
          const newPeriod = ConfigManager.getPeriodDays();
          this._panel.webview.postMessage({
            command: 'setPeriod',
            value: newPeriod,
          });
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    ConfigPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    // const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview() {
    const currentPeriod = ConfigManager.getPeriodDays();

    const html = String.raw;
    // Simple HTML for now
    return html`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>ChurnLens Configuration</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              padding: 20px;
              color: var(--vscode-editor-foreground);
              background-color: var(--vscode-editor-background);
            }
            h1 {
              color: var(--vscode-editor-foreground);
            }
            .setting {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 5px;
            }
            input {
              padding: 5px;
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border: 1px solid var(--vscode-input-border);
            }
            button {
              padding: 8px 16px;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              cursor: pointer;
            }
            button:hover {
              background: var(--vscode-button-hoverBackground);
            }
          </style>
        </head>
        <body>
          <h1>ChurnLens Configuration</h1>

          <div class="setting">
            <label for="period">Churn Calculation Period (Days)</label>
            <input type="number" id="period" value="${currentPeriod}" min="1" />
            <button onclick="updatePeriod()">Save</button>
          </div>

          <script>
            const vscode = acquireVsCodeApi();
            function updatePeriod() {
              const value = parseInt(document.getElementById('period').value);
              vscode.postMessage({
                command: 'updatePeriod',
                value: value,
              });
            }

            // Listen for messages from the extension
            window.addEventListener('message', (event) => {
              const message = event.data;
              switch (message.command) {
                case 'setPeriod':
                  document.getElementById('period').value = message.value;
                  break;
              }
            });
          </script>
        </body>
      </html>`;
  }
}
