import * as vscode from 'vscode';
import { ConfigManager, RangePreset } from '../config';
import { webviewHtml } from './html';

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
      { enableScripts: true, localResourceRoots: [extensionUri] },
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
      this._disposables,
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

  private _getHtmlForWebview(): string {
    const config = vscode.workspace.getConfiguration('churnlens');
    const payload: ConfigPayload = {
      preset: config.get<RangePreset>('rangePreset', '30d'),
      start: config.get<string>('rangeStart', ''),
      end: config.get<string>('rangeEnd', ''),
      hideRoot: config.get<boolean>('hideRoot', true),
      commitLabels: ConfigManager.getCommitLabels().join(', '),
    };

    const json = JSON.stringify(payload)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
    const body = `<div id="app" data-config="${json}"></div>`;

    return webviewHtml(this._panel.webview, this._extensionUri, 'src/webview/config/main.ts', body);
  }
}
