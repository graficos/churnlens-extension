import * as vscode from 'vscode';
import { ChurnCalculator } from './churn';
import { ConfigManager } from './config';
import { GitService } from './git';

export class ChurnDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations: vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  > = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations: vscode.Event<
    vscode.Uri | vscode.Uri[] | undefined
  > = this._onDidChangeFileDecorations.event;

  private fileLevels: Map<string, number> = new Map();
  private fileCounts: Map<string, number> = new Map();
  private gitService: GitService;

  constructor(gitService: GitService) {
    this.gitService = gitService;
  }

  async refresh() {
    if (!vscode.workspace.workspaceFolders) return;
    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const days = ConfigManager.getPeriodDays();

    const rawFileCounts = await this.gitService.getFileHistory(days);
    const result = ChurnCalculator.calculate(rawFileCounts, rootPath);

    this.fileCounts = result.counts;
    this.fileLevels = result.levels;

    this._onDidChangeFileDecorations.fire(undefined);
  }

  provideFileDecoration(
    uri: vscode.Uri
  ): vscode.ProviderResult<vscode.FileDecoration> {
    const count = this.fileCounts.get(uri.fsPath) || 0;
    const level = this.fileLevels.get(uri.fsPath) || 0;

    let badge = '';
    let tooltip = '';
    const theme = ConfigManager.getBadgeTheme();

    if (count === 0) {
      // Level 0 - Green
      badge = theme === 'squares' ? '🟩' : '🟢';
      tooltip = `\nChurnLens: No changes in the last ${ConfigManager.getPeriodDays()} days`;
    } else {
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
      } else {
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
      tooltip = `\nChurnLens: ${count} changes in the last ${ConfigManager.getPeriodDays()} days`;
    }

    return {
      badge: badge,
      tooltip: tooltip,
      color: undefined,
    };
  }
}
