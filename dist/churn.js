"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurnCalculator = void 0;
const path = require("path");
class ChurnCalculator {
    // We now return the itemCounts map directly alongside levels so the provider can show specific counts
    static calculate(fileCounts, rootPath) {
        const levels = new Map();
        const itemCounts = new Map(fileCounts);
        // Aggregate counts for folders
        for (const [filePath, count] of fileCounts.entries()) {
            let currentDir = path.dirname(filePath);
            // Go up until we reach the root
            while (currentDir.startsWith(rootPath)) {
                itemCounts.set(currentDir, (itemCounts.get(currentDir) || 0) + count);
                if (currentDir === rootPath)
                    break;
                const parent = path.dirname(currentDir);
                if (parent === currentDir)
                    break;
                currentDir = parent;
            }
        }
        let max = 0;
        for (const count of itemCounts.values()) {
            if (count > max)
                max = count;
        }
        if (max === 0) {
            return { levels, counts: itemCounts };
        }
        for (const [item, count] of itemCounts.entries()) {
            // Simple linear normalization
            const normalized = count / max;
            // Map to 1-6 levels
            // If count is 0 (shouldn't be in map if from git log), level is 0
            const level = Math.ceil(normalized * 6);
            levels.set(item, level);
        }
        return { levels, counts: itemCounts };
    }
}
exports.ChurnCalculator = ChurnCalculator;
//# sourceMappingURL=churn.js.map