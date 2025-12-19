import * as vscode from 'vscode';

export class ConfigManager {
  static getPeriodDays(): number {
    return vscode.workspace.getConfiguration('churnlens').get('periodDays', 30);
  }
}
