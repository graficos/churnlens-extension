"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurnDecorationProvider = void 0;
const vscode = require("vscode");
const churn_1 = require("./churn");
const config_1 = require("./config");
class ChurnDecorationProvider {
    constructor(gitService) {
        this._onDidChangeFileDecorations = new vscode.EventEmitter();
        this.onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;
        this.fileLevels = new Map();
        this.fileCounts = new Map();
        this.gitService = gitService;
    }
    async refresh() {
        if (!vscode.workspace.workspaceFolders)
            return;
        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const days = config_1.ConfigManager.getPeriodDays();
        const rawFileCounts = await this.gitService.getFileHistory(days);
        const result = churn_1.ChurnCalculator.calculate(rawFileCounts, rootPath);
        this.fileCounts = result.counts;
        this.fileLevels = result.levels;
        this._onDidChangeFileDecorations.fire(undefined);
    }
    provideFileDecoration(uri) {
        const count = this.fileCounts.get(uri.fsPath) || 0;
        const level = this.fileLevels.get(uri.fsPath) || 0;
        let badge = '';
        let tooltip = '';
        const theme = config_1.ConfigManager.getBadgeTheme();
        if (count === 0) {
            // Level 0 - Green
            badge = theme === 'squares' ? '🟩' : '🟢';
            tooltip = `\nChurnLens: No changes in the last ${config_1.ConfigManager.getPeriodDays()} days`;
        }
        else {
            // Mapping levels 1-6 to Emojis
            if (theme === 'squares') {
                switch (level) {
                    case 1:
                        badge = '�';
                        break;
                    case 2:
                        badge = '🟨';
                        break;
                    case 3:
                        badge = '�';
                        break;
                    case 4:
                        badge = '�';
                        break;
                    case 5:
                        badge = '🟥';
                        break; // Repeat red? Or maybe purple/brown square? 🟫?
                    case 6:
                        badge = '🔥';
                        break; // Fire is universal? or ⬛?
                    // Let's keep Fire for highest levels even in square theme for impact
                    default:
                        badge = '�';
                }
            }
            else {
                // Circles (Default)
                switch (level) {
                    case 1:
                        badge = '🟢';
                        break;
                    case 2:
                        badge = '🟡';
                        break;
                    case 3:
                        badge = '🟠';
                        break;
                    case 4:
                        badge = '🔴';
                        break;
                    case 5:
                        badge = '🔥';
                        break;
                    case 6:
                        badge = '💥';
                        break;
                    default:
                        badge = '🟢';
                }
            }
            tooltip = `\nChurnLens: ${count} changes in the last ${config_1.ConfigManager.getPeriodDays()} days`;
        }
        return {
            badge: badge,
            tooltip: tooltip,
            color: undefined,
        };
    }
}
exports.ChurnDecorationProvider = ChurnDecorationProvider;
//# sourceMappingURL=decorations.js.map