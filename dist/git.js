"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
const simple_git_1 = require("simple-git");
const path = require("path");
const logger_1 = require("./logger");
class GitService {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.git = (0, simple_git_1.default)(rootPath);
        logger_1.Logger.log(`GitService initialized for root: ${rootPath}`);
    }
    async getFileHistory(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const since = date.toISOString().split('T')[0];
        logger_1.Logger.log(`Fetching git history since ${since}`);
        try {
            // Using raw log command
            // Format: --name-only to get file list
            const rawLog = await this.git.raw([
                'log',
                `--since=${since}`,
                '--name-only',
                '--pretty=format:',
            ]);
            const fileCounts = new Map();
            const lines = rawLog.split('\n');
            let count = 0;
            for (const line of lines) {
                const trimmed = line.trim();
                // Ignore empty lines
                if (!trimmed)
                    continue;
                // Git returns relative paths from root. Decoration provider gives us absolute paths.
                // We must normalize to absolute paths.
                // NOTE: Git always uses forward slashes. Path.resolve should handle OS separators.
                try {
                    const absPath = path.resolve(this.rootPath, trimmed);
                    // On Windows/Mac, casing might matter or not. VS Code usually uses exact path.
                    // Let's store exact absolute path.
                    fileCounts.set(absPath, (fileCounts.get(absPath) || 0) + 1);
                    count++;
                }
                catch (e) {
                    logger_1.Logger.error(`Error resolving path for line: ${trimmed}`, e);
                }
            }
            logger_1.Logger.log(`Processed ${count} file changes across ${fileCounts.size} unique files.`);
            // Debug: print top 5 changed files
            const top5 = Array.from(fileCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            logger_1.Logger.log('Top 5 changed files (paths might be absolute):', top5);
            return fileCounts;
        }
        catch (e) {
            logger_1.Logger.error('Error fetching git history:', e);
            return new Map();
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=git.js.map