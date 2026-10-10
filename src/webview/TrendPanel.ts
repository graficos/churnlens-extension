import * as vscode from 'vscode';
import { handleWebMessage } from '../messages';
import { ViewState, WebToExt } from '../protocol';
import { ChurnStore } from '../store';
import { webviewHtml } from './html';

export class TrendPanel {
  public static currentPanel: TrendPanel | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _visible = false;

  public static createOrShow(extensionUri: vscode.Uri, store: ChurnStore) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (TrendPanel.currentPanel) {
      TrendPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'churnlensTrend',
      'ChurnLens Trend',
      column ?? vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [extensionUri] },
    );

    TrendPanel.currentPanel = new TrendPanel(panel, extensionUri, store);
  }

  private constructor(
    private readonly _panel: vscode.WebviewPanel,
    private readonly _extensionUri: vscode.Uri,
    private readonly _store: ChurnStore,
  ) {
    this._panel.webview.html = webviewHtml(
      this._panel.webview,
      this._extensionUri,
      'src/webview/trend/main.ts',
      '<div id="app"></div>',
      { codicons: true },
    );
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._disposables.push(this._store.onDidChange((state) => this.post(state)));
    this._panel.webview.onDidReceiveMessage(
      (message: WebToExt) =>
        void handleWebMessage(
          { store: this._store, extensionUri: this._extensionUri },
          message,
          (state) => this.post(state),
        ),
      null,
      this._disposables,
    );

    this._visible = this._panel.visible;
    this._store.setVisible(this._visible);
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible === this._visible) return;
        this._visible = this._panel.visible;
        this._store.setVisible(this._visible);
      },
      null,
      this._disposables,
    );
  }

  private post(state: ViewState) {
    void this._panel.webview.postMessage({ type: 'state', state });
  }

  public dispose() {
    TrendPanel.currentPanel = undefined;
    if (this._visible) {
      this._store.setVisible(false);
      this._visible = false;
    }
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }
}
