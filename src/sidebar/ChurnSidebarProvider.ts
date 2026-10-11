import * as vscode from 'vscode';
import { handleWebMessage } from '../messages';
import { ExtToWeb, ViewState, WebToExt } from '../protocol';
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
    );

    const storeSub = this.store.onDidChange((state) => this.post(state));

    let visible = false;
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible === visible) return;
      visible = webviewView.visible;
      this.store.setVisible(visible);
    });
    webviewView.webview.onDidReceiveMessage(
      (message: WebToExt) =>
        void handleWebMessage(
          { store: this.store, extensionUri: this._extensionUri },
          message,
          (state) => this.post(state),
        ),
    );

    visible = webviewView.visible;
    this.store.setVisible(visible);

    webviewView.onDidDispose(() => {
      storeSub.dispose();
      if (visible) {
        visible = false;
        this.store.setVisible(false);
      }
    });
  }

  private post(state: ViewState) {
    const message: ExtToWeb = { type: 'state', state };
    void this._view?.webview.postMessage(message);
  }
}
