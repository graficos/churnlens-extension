# ChurnLens

**ChurnLens** helps you identify "hotspots" in your codebase by visualizing code churn directly in the VS Code File Explorer. Files that change frequently are highlighted with color-coded decorations, allowing you to spot potential areas of instability or high maintenance at a glance.

## Features

- **Heatmap Decorations**: Files are colored from Green (Low Churn) to Red (High Churn) based on their modification history.
- **Churn Tooltips**: Hover over any decorated file to see the exact number of changes in the configured period.
- **Configurable Lookback**: Adjust the time window for churn calculation (default: 30 days).
- **Customizable Palette**: Configure the colors used for the 6 churn levels.

## Configuration

You can configure ChurnLens via the built-in configuration page or standard VS Code settings.

### Configuration Page

Run the command `ChurnLens: Open Configuration` to open the visual configuration editor.
Here you can:

- Set the **Churn Calculation Period** (in days).
- Preview the current **Color Palette**.

### Extension Settings

- `churnlens.periodDays`: Number of days to look back in git history to calculate churn (default: `30`).

### Color Customization

You can customize the 6 churn levels in your `settings.json` using `workbench.colorCustomizations`:

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

## Requirements

- The opened folder must be a **Git repository**.
- **Git** must be installed and available in your system PATH.

## Development
