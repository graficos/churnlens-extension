import * as vscode from 'vscode';
import { GitService } from './git';
import { ChurnSidebarProvider } from './sidebar/ChurnSidebarProvider';
import { ConfigPanel } from './webview/ConfigPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('ChurnLens is now active!');

  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const gitService = new GitService(rootPath);

  // Register Sidebar
  const sidebarProvider = new ChurnSidebarProvider(
    context.extensionUri,
    gitService
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChurnSidebarProvider.viewType,
      sidebarProvider
    )
  );

  let disposable = vscode.commands.registerCommand(
    'churnlens.openConfig',
    () => {
      ConfigPanel.createOrShow(context.extensionUri);
    }
  );

  let refreshDisposable = vscode.commands.registerCommand(
    'churnlens.refresh',
    () => {
      // Refresh sidebar
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('ChurnLens: Refreshed churn stats.');
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(refreshDisposable);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('churnlens.periodDays')) {
        sidebarProvider.refresh();
      }
    })
  );
}

export function deactivate() {}
