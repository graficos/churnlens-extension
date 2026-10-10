import * as vscode from 'vscode';
import { ExtToWeb, RangePreset, ViewState, WebToExt } from '../protocol';
import { ChurnStore } from '../store';
import { webviewHtml } from '../webview/html';

export class ChurnSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'churnlens.sidebar';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly store: ChurnStore,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = webviewHtml(
      webviewView.webview,
      this._extensionUri,
      'src/webview/sidebar/main.ts',
      '<div id="app"></div>',
      { codicons: true },
    );

    const storeSub = this.store.onDidChange((state) => this.post(state));
    webviewView.onDidDispose(() => storeSub.dispose());

    let visible = false;
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible === visible) return;
      visible = webviewView.visible;
      this.store.setVisible(visible);
    });
    webviewView.webview.onDidReceiveMessage((message: WebToExt) => void this.handle(message));

    visible = webviewView.visible;
    this.store.setVisible(visible);
  }

  private post(state: ViewState) {
    const message: ExtToWeb = { type: 'state', state };
    void this._view?.webview.postMessage(message);
  }

  private async handle(message: WebToExt) {
    switch (message.type) {
      case 'ready':
        this.post(this.store.current);
        break;
      case 'refresh':
        await this.store.refresh();
        break;
      case 'setRange':
        await this.setRange(message.preset, message.start, message.end);
        break;
      case 'setMetric':
        this.store.setMetric(message.value);
        break;
      case 'select':
        this.store.setSelection(message.path);
        break;
      case 'openFile':
        await vscode.window.showTextDocument(vscode.Uri.file(message.path));
        break;
      case 'openInfo':
        await vscode.window.showTextDocument(
          vscode.Uri.joinPath(this._extensionUri, 'docs', 'churn-and-delta.md'),
          { preview: true },
        );
        break;
      case 'openSettings':
        await vscode.commands.executeCommand('churnlens.openConfig');
        break;
    }
  }

  private async setRange(preset: RangePreset, start?: string, end?: string) {
    const config = vscode.workspace.getConfiguration('churnlens');
    const target = vscode.ConfigurationTarget.Global;
    if (preset === 'custom') {
      if (start !== undefined) await config.update('rangeStart', start, target);
      if (end !== undefined) await config.update('rangeEnd', end, target);
    }
    await config.update('rangePreset', preset, target);
  }
}
