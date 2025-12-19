"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const git_1 = require("./git");
const ChurnSidebarProvider_1 = require("./sidebar/ChurnSidebarProvider");
const ConfigPanel_1 = require("./webview/ConfigPanel");
function activate(context) {
    console.log('ChurnLens is now active!');
    if (!vscode.workspace.workspaceFolders) {
        return;
    }
    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const gitService = new git_1.GitService(rootPath);
    // Register Sidebar
    const sidebarProvider = new ChurnSidebarProvider_1.ChurnSidebarProvider(context.extensionUri, gitService);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChurnSidebarProvider_1.ChurnSidebarProvider.viewType, sidebarProvider));
    let disposable = vscode.commands.registerCommand('churnlens.openConfig', () => {
        ConfigPanel_1.ConfigPanel.createOrShow(context.extensionUri);
    });
    let refreshDisposable = vscode.commands.registerCommand('churnlens.refresh', () => {
        // Refresh sidebar
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('ChurnLens: Refreshed churn stats.');
    });
    let openInGithubDisposable = vscode.commands.registerCommand('churnlens.openInGithub', async (contextArg) => {
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
        }
        catch (e) {
            vscode.window.showErrorMessage('ChurnLens: Error opening GitHub history.');
            console.error(e);
        }
    });
    context.subscriptions.push(disposable);
    context.subscriptions.push(refreshDisposable);
    context.subscriptions.push(openInGithubDisposable);
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('churnlens.periodDays') ||
            e.affectsConfiguration('churnlens.hideRoot')) {
            sidebarProvider.refresh();
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map