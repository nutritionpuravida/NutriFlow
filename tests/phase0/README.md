# Nutrese Phase 0 Regression Baseline

Phase 0 is the instrumentation baseline for the current Nutrese web application engine.

This directory captures current browser behavior before Decision Trace instrumentation is added. The baselines are committed as the regression contract for later migration work.

This Phase 0 run targets the fresh GitHub-live source folder downloaded on 2026-07-10, not the older invalid May 22 Codex workspace folder.

## Scope

In scope:

- Current web application runtime: root `index.html`
- Exchange System outputs
- Meal text in Greek and English
- Structured portions and exchange totals
- 7-day plan current browser behavior
- Report-facing meal text snapshots
- AI-shaped application contract fixtures

Out of scope:

- Supabase, Stripe, Google Calendar network integration tests
- Real LLM/Edge Function integration tests
- Android parity work
- Any change to meal-plan behavior
- Product visual redesign or UI styling decisions
- Visual-regression screenshots that would establish styling as the canonical regression contract

## Visual Design Clarification

The current GitHub-live `index.html` is the current application reference for this Phase 0 run. Phase 0 still must not make UI design decisions or create screenshot-based visual regression baselines.

Phase 0 browser baselines capture clinically meaningful behavior only:

- rendered meal text in Greek and English
- portions and quantities
- exchange totals
- warnings and quality messages
- active execution paths
- deterministic structured outputs

## Android Engine Reference

An older separate Android engine exists in a different local workspace under:

- `NutriEngineAndroid/NutriEngineAndroid/app/src/main/java/com/nutritionpuravida/nutriengine/engine`
- tests under `NutriEngineAndroid/NutriEngineAndroid/app/src/test/java/com/nutritionpuravida/nutriengine/engine`

It appears to duplicate some planning concepts in native Kotlin engine files, but the actively deployed GitHub Pages runtime remains the web app in `nutriflow/index.html`.

The Android engine is reference only for Phase 0. Do not modify it, do not generate web baselines from it, and do not attempt cross-platform parity work in this phase. If future review finds clinically meaningful differences, handle that as a separate migration/audit task.

## Synthetic Data Rule

Committed fixtures and baselines must contain synthetic data only.

Do not include real, pseudonymized, lightly anonymized, or identifiable client data, notes, dates, or combinations.

## Commands

From the repository/worktree root containing `index.html`:

```powershell
$root='C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$core='C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright-core@1.61.1\node_modules'
$env:NODE_PATH="$root;$core"
node tests/phase0/run-baseline.mjs
node tests/phase0/compare-baseline.mjs
```

Syntax check:

```powershell
node --check tests/phase0/helpers/browser-harness.mjs
node --check tests/phase0/helpers/normalize-output.mjs
node --check tests/phase0/helpers/synthetic-client-state.mjs
node --check tests/phase0/run-baseline.mjs
node --check tests/phase0/compare-baseline.mjs
```

Inline app syntax check is still required separately for `index.html`.

## Baseline Contract

The committed baseline captures:

- Greek rendered meal text
- English rendered meal text
- structured meal/day kcal
- portions and exchange totals
- warnings and quality messages
- AI-shaped fixture handling

Screenshots are not part of the canonical Phase 0 regression contract. Use normalized JSON only.
