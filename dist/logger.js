"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode = require("vscode");
class Logger {
    static get outputChannel() {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel('ChurnLens');
        }
        return this._outputChannel;
    }
    static log(message, data) {
        const timestamp = new Date().toLocaleTimeString();
        if (data) {
            this.outputChannel.appendLine(`[${timestamp}] ${message} ${JSON.stringify(data, null, 2)}`);
        }
        else {
            this.outputChannel.appendLine(`[${timestamp}] ${message}`);
        }
        // Force show? No, that's annoying. User can open it if they want.
    }
    static error(message, error) {
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
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map