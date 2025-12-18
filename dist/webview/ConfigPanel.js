"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigPanel = void 0;
const vscode = require("vscode");
const config_1 = require("../config");
class ConfigPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('churnlensConfig', 'ChurnLens Configuration', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        });
        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'updatePeriod':
                    vscode.workspace
                        .getConfiguration('churnlens')
                        .update('periodDays', message.value, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(`ChurnLens: Period updated to ${message.value} days`);
                    return;
                case 'updateTheme':
                    vscode.workspace
                        .getConfiguration('churnlens')
                        .update('badgeTheme', message.value, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(`ChurnLens: Theme updated to ${message.value}`);
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        ConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        // const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview();
    }
    _getHtmlForWebview() {
        const currentPeriod = config_1.ConfigManager.getPeriodDays();
        const colors = config_1.ConfigManager.getColors();
        const currentTheme = config_1.ConfigManager.getBadgeTheme();
        const html = String.raw;
        // Simple HTML for now
        return html `<!DOCTYPE html>
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
            .palette {
              display: flex;
              gap: 10px;
              margin-top: 10px;
            }
            .color-box {
              width: 30px;
              height: 30px;
              border: 1px solid #ccc;
            }
            select {
              padding: 5px;
              background: var(--vscode-dropdown-background);
              color: var(--vscode-dropdown-foreground);
              border: 1px solid var(--vscode-dropdown-border);
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

          <div class="setting">
            <label for="theme">Badge Theme</label>
            <select id="theme" onchange="updateTheme()">
              <option
                value="circles"
                ${currentTheme === 'circles' ? 'selected' : ''}
              >
                Circles
              </option>
              <option
                value="squares"
                ${currentTheme === 'squares' ? 'selected' : ''}
              >
                Squares
              </option>
            </select>
          </div>

          <div class="setting">
            <label>Current Color Palette (Low -> High)</label>
            <div class="palette">
              ${colors
            .map((c) => `<div class="color-box" style="background-color: ${c}" title="${c}"></div>`)
            .join('')}
            </div>
            <p>
              <em
                >Color configuration via this UI is coming soon. You can
                currently edit colors in User Settings (JSON).</em
              >
            </p>
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
            function updateTheme() {
              const value = document.getElementById('theme').value;
              vscode.postMessage({
                command: 'updateTheme',
                value: value,
              });
            }
          </script>
        </body>
      </html>`;
    }
}
exports.ConfigPanel = ConfigPanel;
//# sourceMappingURL=ConfigPanel.js.map