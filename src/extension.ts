import * as vscode from 'vscode';
import * as path from 'path';
import { GitService } from './git';
import { ChurnSidebarProvider } from './sidebar/ChurnSidebarProvider';
import { ChurnStore } from './store';
import { ConfigPanel } from './webview/ConfigPanel';
import { TrendPanel } from './webview/TrendPanel';

export function activate(context: vscode.ExtensionContext) {
  try {
    activateInternal(context);
  } catch (e) {
    console.error('ChurnLens: activation failed', e);
    vscode.window.showErrorMessage(
      `ChurnLens failed to activate: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function activateInternal(context: vscode.ExtensionContext) {
  console.log('ChurnLens is now active!');

  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const gitService = new GitService(rootPath);
  const store = new ChurnStore(gitService, rootPath);

  // Register Sidebar
  const sidebarProvider = new ChurnSidebarProvider(context.extensionUri, store);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChurnSidebarProvider.viewType, sidebarProvider),
  );

  let disposable = vscode.commands.registerCommand('churnlens.openConfig', () => {
    ConfigPanel.createOrShow(context.extensionUri);
  });

  let refreshDisposable = vscode.commands.registerCommand('churnlens.refresh', () => {
    void store.refresh();
    vscode.window.showInformationMessage('ChurnLens: Refreshed churn stats.');
  });

  let openTrendDisposable = vscode.commands.registerCommand('churnlens.openTrend', () => {
    TrendPanel.createOrShow(context.extensionUri, store);
  });

  let openInGithubDisposable = vscode.commands.registerCommand(
    'churnlens.openInGithub',
    async (contextArg) => {
      if (!contextArg || !contextArg.path) {
        return;
      }

      const filePath = contextArg.path;
      try {
        const remoteUrl = await gitService.getRemoteUrl();
        if (!remoteUrl) {
          vscode.window.showErrorMessage('ChurnLens: Could not find git remote URL.');
          return;
        }

        // Clean remote URL (e.g. git@github.com:user/repo.git -> https://github.com/user/repo)
        let httpUrl = remoteUrl.replace(/\.git$/, '');
        if (httpUrl.startsWith('git@')) {
          httpUrl = httpUrl.replace(':', '/').replace('git@', 'https://');
        }

        // Relative path
        const relPath = path.relative(rootPath, filePath);
        // Ensure forward slashes
        const normalizedRelPath = relPath.split(path.sep).join('/');

        // Construct commits URL
        // Format: https://github.com/user/repo/commits/main/path/to/file
        // We will default to HEAD (usually main/master) or simply no branch part?
        // Actually github url is /commits/[branch]/[path]
        // If we don't know the branch, maybe just 'HEAD'?
        const finalUrl = `${httpUrl}/commits/HEAD/${normalizedRelPath}`;

        vscode.env.openExternal(vscode.Uri.parse(finalUrl));
      } catch (e) {
        vscode.window.showErrorMessage('ChurnLens: Error opening GitHub history.');
        console.error(e);
      }
    },
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(refreshDisposable);
  context.subscriptions.push(openTrendDisposable);
  context.subscriptions.push(openInGithubDisposable);

  // Listen for configuration changes (debounced: one refresh per burst)
  let refreshTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => void store.refresh(), 150);
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('churnlens.rangePreset') ||
        e.affectsConfiguration('churnlens.rangeStart') ||
        e.affectsConfiguration('churnlens.rangeEnd') ||
        e.affectsConfiguration('churnlens.commitLabels') ||
        e.affectsConfiguration('churnlens.hideRoot') ||
        e.affectsConfiguration('churnlens.baseline')
      ) {
        scheduleRefresh();
      }
    }),
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    }),
  );
}

export function deactivate() {}
