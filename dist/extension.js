"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
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
    context.subscriptions.push(disposable);
    context.subscriptions.push(refreshDisposable);
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('churnlens.periodDays')) {
            sidebarProvider.refresh();
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map