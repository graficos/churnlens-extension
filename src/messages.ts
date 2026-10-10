import * as vscode from 'vscode';
import { RangePreset, ViewState, WebToExt } from './protocol';
import { ChurnStore } from './store';

export interface MessageHost {
  store: ChurnStore;
  extensionUri: vscode.Uri;
}

export async function handleWebMessage(
  host: MessageHost,
  message: WebToExt,
  post: (state: ViewState) => void,
) {
  switch (message.type) {
    case 'ready':
      post(host.store.current);
      break;
    case 'refresh':
      await host.store.refresh();
      break;
    case 'setRange':
      await setRange(message.preset, message.start, message.end);
      break;
    case 'setMetric':
      host.store.setMetric(message.value);
      break;
    case 'select':
      host.store.setSelection(message.path);
      break;
    case 'openFile':
      await vscode.window.showTextDocument(vscode.Uri.file(message.path));
      break;
    case 'openInfo':
      await vscode.window.showTextDocument(
        vscode.Uri.joinPath(host.extensionUri, 'docs', 'churn-and-delta.md'),
        { preview: true },
      );
      break;
    case 'openSettings':
      await vscode.commands.executeCommand('churnlens.openConfig');
      break;
    case 'openTrend':
      await vscode.commands.executeCommand('churnlens.openTrend');
      break;
  }
}

async function setRange(preset: RangePreset, start?: string, end?: string) {
  const config = vscode.workspace.getConfiguration('churnlens');
  const target = vscode.ConfigurationTarget.Global;
  if (preset === 'custom') {
    if (start !== undefined) await config.update('rangeStart', start, target);
    if (end !== undefined) await config.update('rangeEnd', end, target);
  }
  await config.update('rangePreset', preset, target);
}
