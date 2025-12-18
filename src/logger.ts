import * as vscode from 'vscode';

export class Logger {
  private static _outputChannel: vscode.OutputChannel;

  static get outputChannel(): vscode.OutputChannel {
    if (!this._outputChannel) {
      this._outputChannel = vscode.window.createOutputChannel('ChurnLens');
    }
    return this._outputChannel;
  }

  static log(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    if (data) {
      this.outputChannel.appendLine(
        `[${timestamp}] ${message} ${JSON.stringify(data, null, 2)}`
      );
    } else {
      this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
    // Force show? No, that's annoying. User can open it if they want.
  }

  static error(message: string, error?: any) {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
    if (error) {
      this.outputChannel.appendLine(error.toString());
      if (error instanceof Error && error.stack) {
        this.outputChannel.appendLine(error.stack);
      }
    }
    this.outputChannel.show(true); // Show on error
  }
}
