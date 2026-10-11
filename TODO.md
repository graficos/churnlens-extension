# ChurnLens Roadmap

This document tracks the planned work in phases. It is a living doc; tick items
off as they land.

## Goal

Report **objective churn metrics**. Nothing enters the product unless it is
directly about churn. We prefer a loading state over background work, and we
never let the extension consume CPU unless one of its views is visible.

## Canonical metric definitions

These names mean one thing everywhere: tree view, charts, docs, exports.

| Signal | Formula | Meaning |
| --- | --- | --- |
| Added | count | New lines in the window |
| Removed | count | Deleted lines in the window |
| Modified | count | Lines present before and after |
| Delta | added - deleted | Net growth (signed) |
| Churn | added + deleted | Total movement (absolute, the risk signal) |
| Deletion ratio | deleted / added | Rework pressure per period |

Churn is the predictor. Delta is the direction. Never mix them. See
[`docs/churn-and-delta.md`](docs/churn-and-delta.md).

## Principles

1. **Churn only.** No people metrics, no change-request counts. The source paper
   found those weaker and unrelated.
2. **Light on CPU.** Git work runs only while a ChurnLens view is visible. Cache
   by `{range, HEAD}`. Show a loading state instead of polling.
3. **One pass.** Fetch everything from a single `git log` running per refresh.
4. **Explain in the repo.** Long explanations live in `docs/`. Short ones are
   inline info blocks that link to them.
5. **Theme-aware.** Base on VS Code theme variables so light, dark and
   high-contrast work for free.

---

## Phase 0 — Foundations and bug fixes

Correct the data layer and the date handling. The existing tree view keeps
working on top of the new output. No new visuals yet.

**Out of Phase 0:** the path-prefix/grouping rework. The shared `isWithin`
helper is now correct and used for workspace filtering, but the folder
aggregation structure is otherwise unchanged.

### Bug note — path prefix collision (deferred)

`filePath.startsWith(rootPath)` is a plain string test. It is wrong in two ways:

- `rootPath = /a/repo` also matches `/a/repository/file.ts`, because
  `/a/repository/...` literally starts with the characters `/a/repo`.
- A path that is exactly the root matches too, and so do sibling folders whose
  names share the prefix.

The fix is to compare path segments, not characters:
`filePath === rootPath || filePath.startsWith(rootPath + path.sep)`.
This now lives in `src/paths.ts` as `isWithin` and is used for workspace
filtering and folder aggregation. The broader tree/grouping rework stays in
Phase 1.

---

## Phase 1 — Trend view

A dedicated trend panel with charts, state shared with the tree.

---

## Phase 2 — Export and advanced churn

- [ ] **2.1 Export report.** Standalone HTML with data inlined, plus CSV and
      JSON. Reuse the webview markup so the report matches what is on screen.
- [ ] **2.2 Deleted-line provenance.** Use `git log --diff-filter=D` and
      `git blame` on the parent revision to age the deleted lines. Recent
      deletions are rework; old deletions are refactoring. This answers whether
      rising churn is rework or cleanup.
- [ ] **2.3 Theme system.** Evaluate a component-theme system for many ready
      themes. Weigh the cost: it pulls a CSS framework and a build step. Only
      adopt if the win justifies the weight.

---

## Chart and colour system

Applies across the tree view, charts, panels and docs.

- **Semantic colours, fixed everywhere:** added = green, modified = yellow,
  removed = red.
- **Risk intensity:** a sequential single-hue ramp (red). The lightest step must
  keep enough contrast on the light theme.
- **Theme-aware:** derive from `--vscode-*` variables, then override with accent
  tokens. Light, dark and high-contrast all work without extra work.
- **Style:** rounded bar corners, gradient area fills, subtle grid lines, quiet
  axes. Keep the reference aesthetic in mind when implementing.
