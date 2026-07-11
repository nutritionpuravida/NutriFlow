# Nutrese Agent Instructions

Nutrese work is governed by:

- Nutrese Planning Engine Architecture v2.1
- Nutrese Engineering Constitution
- Nutrese Technical Blueprint
- Nutrese Implementation Roadmap

These documents are frozen. Do not redesign the architecture during ordinary work.

## Core Rules

- No broad refactors without explicit approval.
- Follow the approved roadmap phase.
- Phase 0 must not change allocation behavior.
- No real, pseudonymized, lightly anonymized, or identifiable client data in committed fixtures.
- All committed fixtures and baselines must be synthetic.
- Do not introduce a second source of truth.
- Do not silently drop exchanges, nutrients, warnings, overrides, or constraints.
- Unknown nutrient data must never be treated as zero.
- Manual clinical overrides must survive recalculation, save/load, and export.
- AI may suggest, but must never bypass deterministic validation.
- Duplicated or risky code should be documented and traced during Phase 0, not cleaned up.
- Regression tests must run before and after relevant planning-engine changes.
- Preserve the `CNAME` file in repository/deployment work. Its absence silently breaks the `nutrese.eu` custom domain.
- This is a live product with real Supabase data and live Stripe billing. Treat deployment and auth/billing changes as production-risk changes.

## High-Risk Runtime Areas

The current web runtime is primarily `index.html`. Treat these as clinical paths:

- `MEALS` / `MEALS_EN`
- `MEAL_EXCHANGES`
- `FIXED_COMPOSITION_MEALS`
- `buildSlotSnack`
- `getDayMealAllocation`
- `allocateRemainingExchange`
- `allocateProteinRemaining`
- `allocateFatRemaining`
- `calcDayTotalsForPlan`
- `calcDayTotalsForPlanDisplay`
- `buildSevenDay`
- `buildReport`
- AI plan handling

## Required Checks

Before completion:

- Run inline JavaScript syntax check.
- Run Phase 0 regression suite once available.
- Report changed files.
- Report app fingerprint when `index.html` changes.
- If pushing to GitHub Pages, wait for the current deployment to finish before pushing again.

## Forbidden Without Approval

- Changing exchange kcal values.
- Changing meal definitions or meal text during instrumentation work.
- Refactoring planning engine structure before Phase 0 baseline exists.
- Modifying Stripe, Supabase auth, Google Calendar, or unrelated features while working on Phase 0.
