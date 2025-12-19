"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
class ConfigManager {
    static getPeriodDays() {
        return vscode.workspace.getConfiguration('churnlens').get('periodDays', 30);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map