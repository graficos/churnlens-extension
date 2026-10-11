# Changelog

All notable changes to ChurnLens are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0]

Phases 0 and 1: the churn data layer, the Churn Explorer, and the Trend view.

### Added

- **Trend view**: a dedicated panel with hand-rolled SVG charts.
  - Delta vs Churn, grouped per period.
  - Added and removed lines, stacked.
  - Cumulative churn as a gradient area.
  - Deletion ratio per period.
  - Churn grouped by Conventional Commit type.
  - The three riskiest paths by churn, click to open the file.
- **Shared store**: the sidebar and the trend panel render from one state; the
  extension runs a single `git log` per refresh, cached by `{range, HEAD}`, and
  only while a ChurnLens view is visible.
- **Baseline grouping**: `churnlens.baseline` chooses semver tags, merge
  commits, or calendar buckets (auto prefers tags, then merges, then time).
- **Selectable metric**: churn (total movement) or delta (net growth), with an
  explicit explainer.
- **Commit-label grouping** by Conventional Commit type.
- **Accent themes** for the churn colour, on top of the VS Code theme.
- **Filter banner**: selecting a file or folder narrows the trend; clear it to
  restore the whole range.
- Configuration page, six churn risk levels, and the "See git history in
  GitHub" context menu (carried from 0.0.x).

### Changed

- The Churn Explorer is now a Vue + Tailwind + DaisyUI webview, built with a
  Vite+ toolchain (Rolldown, Oxc, Vitest).
- The tree shows churn and delta columns; a file row opens the trend filtered
  to that file, with a button to open the file in the editor.
- Theme-aware colours throughout, following the VS Code theme.

### Fixed

- Path containment now compares path segments (`isWithin`) instead of raw
  string prefixes, so sibling folders with shared prefixes no longer match.

## [0.0.3] and earlier

- Initial Churn Explorer: a sidebar tree of per-file churn and delta over a
  date range, a configuration page, risk colouring, and a GitHub context menu.
