# ChurnLens - VS Code Extension

<br />
<div align="center">
  <a href="https://github.com/graficos/churnlens-extension">
    <img src="https://github.com/graficos/churnlens-extension/blob/main/public/logo.png?raw=true" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">ChurnLens</h3>
</div>

**ChurnLens** helps you identify "hotspots" in your codebase by visualizing Code Churn directly in the IDE. Files that change frequently are highlighted with different colors in a custom "Churn Explorer" sidebar, allowing you to spot potential areas of instability, high churn or high maintenance at a glance.

## Churn and Delta

ChurnLens uses two different measures of change. They answer different questions.

**Delta is the net change.** It is the lines added minus the lines deleted.

- `+40` means the file grew by 40 lines.
- `-40` means the file shrank by 40 lines.
- `0` means the file changed size by nothing at all.

Delta tells you the direction and the net size of the change.

**Churn is the total movement.** It is the lines added plus the lines deleted, always positive.

- `100` means 100 lines changed, in either direction.

Churn tells you how much change happened.

**Why both?** A file can lose 200 lines and gain 200 different lines. Its delta is `0`, but it was almost completely rewritten. Delta says "no change". Churn says "400 lines of movement". Only churn warns you.

This is the core idea of the research behind ChurnLens: removing a lot of code is about as dangerous as adding a lot. A file that is rewritten is risky even when it does not grow, and delta cannot see that. Churn can.

That is why ChurnLens ranks risk by **churn**, not by delta. In the original study, churn predicted defects better than the number of change requests, the net delta, and the number of people involved. Read the full explanation in [`docs/churn-and-delta.md`](docs/churn-and-delta.md).

This extension is inspired by the research on Code Churn as a predictor of defects:

> **[Code Churn: A Measure for Estimating the Impact of Code Change](https://sci-hub.reatk.com/10.1109/icsm.1998.738486)** > _J.C. Munson; S.G. Elbaum_
> IEEE International Conference on Software Maintenance, 1998.

## Features

![ChurnLens](https://github.com/graficos/churnlens-extension/blob/main/public/screenshot.png?raw=true)

- **Churn Explorer**: A dedicated sidebar exploring the churn of your project with a tree view.
- **Churn and Delta**: Switch the metric you are looking at. Churn measures total movement, delta measures net change.
- **Date range**: Presets for the last 2, 3, 7 or 30 days, plus a custom start and end date.
- **Context Menu Integration**: Right-click on any file in the Churn Explorer to view its **Git history in GitHub**.
- **Light on resources**: Git is read only while a ChurnLens view is open. The extension does not start at editor startup.

## Configuration

You can configure ChurnLens via the built-in configuration page or standard VS Code settings.

### Configuration Page

Run the command `ChurnLens: Open Configuration` to open the visual configuration editor.
Here you can:

- Set the **range preset** or a **custom start and end date**.
- Toggle hiding the root folder.
- Edit the **commit labels** used for grouping.

### Extension Settings

- `churnlens.rangePreset`: `2d`, `3d`, `7d`, `30d` or `custom` (default: `30d`).
- `churnlens.rangeStart`: Custom range start date, `YYYY-MM-DD`.
- `churnlens.rangeEnd`: Custom range end date, `YYYY-MM-DD`.
- `churnlens.commitLabels`: Comma separated Conventional Commit labels (default: the Angular convention).
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
- `ChurnLens: Refresh Stats`: Manually recalculates churn statistics and updates the Churn Explorer.
- `See git history in github`: (Context menu) Opens the file's history on GitHub.

## Requirements

- The opened folder must be a **Git repository**.
- **Git** must be installed and available in your system PATH.

## Development

- Install dependencies with `pnpm`
- Run launch task `Run Extension`. A new window will open. The terminal will keep a `watch` task running the code compilation on every change.
- Select a repository and open the extension in the sidebar.
