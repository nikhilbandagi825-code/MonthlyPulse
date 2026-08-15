# SereneBudget — Product Requirements Document

## Original Problem Statement
Build an efficient and proactive budgeting app that tracks daily expenses and shows the remaining amount for the month with an interactive dashboard.

## Architecture
- **Frontend**: React Native / Expo (expo-router). Main screen `/app/frontend/app/index.tsx` (3 tabs: Overview, History, Budget) + components in `/app/frontend/src/budget/`: `shared.ts` (types/constants), `ExpenseModal.tsx`, `BudgetPanel.tsx`, `HistoryPanel.tsx`, `InsightsCard.tsx`.
- **Persistence**: Local-first via `@/src/utils/storage` (AsyncStorage), key `serene-budget` storing `{ budget, limits, expenses, rollover, recurring }` as a JSON string.
- **Backend**: FastAPI + MongoDB provisioned but currently unused (reserved for future optional account sync).

## User Persona
Individuals who want a calm, low-friction way to track daily spending against a monthly budget and stay proactively aware of category limits — no account required.

## Core Requirements (static)
- Monthly budget + optional per-category limits.
- Quick expense entry: amount, category, note, date, payment method.
- Dashboard: remaining monthly amount, daily safe-to-spend, category spending chart, recent expenses.
- Local-first persistence, no account for v1.
- Calm light financial dashboard aesthetic (forest green #2D6A4F / #52B788 on #F4F7F4).

## Implemented (grows over time)
- 2026-08 (Iteration 1 – MVP): Dashboard (remaining, safe-to-spend, category chart, recent expenses), add-expense flow with payment selection, budget + category limit settings, local persistence.
- 2026-08 (Iteration 2):
  - Native date picker (`@react-native-community/datetimepicker`) in add/edit flow.
  - Expense editing (tap a row to edit; prefilled modal).
  - Category-limit alerts (>=80%) + per-category progress bars on Overview.
  - History tab: monthly average, highest month, last-6-months trend bars (current month highlighted).
  - Improved delete flow: confirmation modal + success toast; long-press row also confirms.
  - Migrated storage from direct AsyncStorage to shared `storage` util.

## Backlog (prioritized)
- **P1**: Search/filter recent expenses; edit/delete from history detail; export data.
- **P2**: Optional account sync/backend API — sync layer over local-first (must not break offline).
- **P2**: Recurring expenses; budget rollover between months.

## Next Tasks
- Consider splitting `index.tsx` into component files (ExpenseModal / BudgetPanel / HistoryPanel) as complexity grows.
- Evaluate backend sync design when user requests accounts.
efactor: split `index.tsx` into `/src/budget/{shared, ExpenseModal, BudgetPanel, HistoryPanel, InsightsCard}`.

## Backlog (prioritized)
- **P1**: Edit/delete from history detail (partially covered via search results); export data.
- **P2**: Optional account sync/backend API — sync layer over local-first (must not break offline).
- **P3 (polish)**: Forward Switch testID to nested input for web automation; migrate deprecated RN-web style props (shadow* → boxShadow).

## Next Tasks
- Evaluate backend sync design when user requests accounts.

## Update (June 2026) — Currency & Editable Categories
- **Currency selector** (BudgetPanel): preset list (USD/EUR/GBP/INR/JPY/CAD/AUD/CNY/AED/BRL) + custom symbol/code entry. Active symbol held module-level in `shared.ts` (`setCurrencySymbol`/`getCurrencySymbol`/`money`), set during `index.tsx` render so all amounts update instantly app-wide. Persisted as `currency` in AsyncStorage.
- **Editable categories**: categories are now dynamic (`Category = {name, icon, color}`), stored under `categories` key, default = DEFAULT_CATEGORIES. New `CategoryEditor.tsx` modal (name + icon grid + color grid). Add/rename/delete from Budget tab. Rename migrates expenses, recurring rules, and the limit key to the new name; delete keeps past expenses; last-category delete is guarded.
- Per-category limits unchanged (saved on "Save budget"), now keyed to dynamic categories.
- Tested via testing_agent iteration_4 — all 8 acceptance criteria PASS, no regressions.
