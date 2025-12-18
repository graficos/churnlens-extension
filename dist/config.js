"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
class ConfigManager {
    static getPeriodDays() {
        return vscode.workspace.getConfiguration('churnlens').get('periodDays', 30);
    }
    static getBadgeTheme() {
        return vscode.workspace
            .getConfiguration('churnlens')
            .get('badgeTheme', 'circles');
    }
    static getColors() {
        // Default palette (Green to Red heatmap style)
        // Level 1 (Low) -> Level 6 (High)
        return [
            '#90EE90', // LightGreen
            '#ADFF2F', // GreenYellow
            '#FFD700', // Gold
            '#FFA500', // Orange
            '#FF4500', // OrangeRed
            '#FF0000', // Red
        ];
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map