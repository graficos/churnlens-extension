# ChurnLens

**ChurnLens** helps you identify "hotspots" in your codebase by visualizing code churn directly in the VS Code File Explorer. Files that change frequently are highlighted, allowing you to spot potential areas of instability or high maintenance at a glance.

## Features

- **Churn Explorer**: A dedicated sidebar exploring the churn of your project with a tree view.
- **Context Menu Integration**: Right-click on any file in the Churn Explorer to view its **Git history in GitHub**.
- **Configurable Lookback**: Adjust the time window for churn calculation (default: 30 days).

## Configuration

You can configure ChurnLens via the built-in configuration page or standard VS Code settings.

### Configuration Page

Run the command `ChurnLens: Open Configuration` to open the visual configuration editor.
Here you can:

- Set the **Churn Calculation Period** (in days).

### Extension Settings

- `churnlens.periodDays`: Number of days to look back in git history to calculate churn (default: `30`).
- `churnlens.hideRoot`: Hide the root project folder from the Churn Explorer (default: `true`).

### Color Customization

While the UI customization has been streamlined, you can still customize the 6 churn levels in your `settings.json` using `workbench.colorCustomizations`:

```json
"workbench.colorCustomizations": {
    "churnlens.level1": "#90EE90", // Low Churn
    "churnlens.level2": "#ADFF2F",
    "churnlens.level3": "#FFD700",
    "churnlens.level4": "#FFA500",
    "churnlens.level5": "#FF4500",
    "churnlens.level6": "#FF0000"  // High Churn
}
```

## Commands

- `ChurnLens: Open Configuration`: Opens the configuration webview.
- `ChurnLens: Refresh Stats`: Manually recalculates churn statistics and updates decorations.
- `See git history in github`: (Context menu) Opens the file's history on GitHub.

## Requirements

- The opened folder must be a **Git repository**.
- **Git** must be installed and available in your system PATH.

## Reference

This extension is inspired by the research on code churn as a predictor of defects:

> **[Code Churn: A Measure for Estimating the Impact of Code Change](https://sci-hub.se/https://ieeexplore.ieee.org/document/738486)** > _J.C. Munson; S.G. Elbaum_
> IEEE International Conference on Software Maintenance, 1998.
