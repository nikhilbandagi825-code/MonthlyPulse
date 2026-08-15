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

## Update (June 2026) — Phase 1 Enhancements (this session)
User requested a large phased enhancement roadmap; agreed to build "everything, phased across sessions".
User settings choices captured for later phases: Income remaining-mode = user-selectable in settings; Dark mode = manual toggle; Export = CSV + JSON backup/restore (both); Savings goals = tied to leftover budget automatically.

**Phase 1 (DONE, tested — testing_agent iteration_1 all pass):**
- History advanced search: amount range (min/max) + date range chips (All time / This month / Last 3 mo / This year) on top of existing note & category search. New `toggle-filters` panel + `clear-filters`.
- Donut/ring chart per category on the Overview "Spending snapshot" (new `DonutChart.tsx`, uses react-native-svg) replacing the bar chart; center shows total spent; legend below.
- Smarter nudge: weekend-vs-weekday spending pattern line in `InsightsCard.tsx` (conditional, shows when one side is >25% heavier per day).
- CSV export + JSON backup + JSON restore under Budget → "DATA & BACKUP" (new `DataManager.tsx`; uses expo-file-system(legacy)/expo-sharing/expo-document-picker; web fallback = Blob download / fetch-read). `expensesToCSV` + `BackupData` added to `shared.ts`. Restore replaces all app state via `importData` in index.tsx.
- Gentle month-end recap card on Overview (`month-recap-card`), shown only in the last 5 days of the month.

**Remaining backlog (phased for next sessions), prioritized:**
- P1 Income tracking — log income; "Remaining" mode selectable in settings (income−expenses vs budget cap). Touches storage model + core math.
- P1 Savings goals — standalone goals tied to leftover budget automatically.
- P1 Multiple accounts/wallets — Cash/Card/Bank balances.
- P2 Yearly overview — 12-month view, best-saving months, averages.
- P2 Dark mode — manual toggle (theme context; touches all stylesheets).
- P2 Onboarding — 2-3 step first-run to set budget + currency.
- P2 Quick-add presets — one-tap re-log common expenses.
- P3 Home screen widget — remaining budget (needs native build).

## Next Tasks
- Phase 3 candidates: Multiple wallets, Yearly overview, Quick-add presets, Home-screen widget (native build).
- Consider extracting Overview subcomponents from index.tsx (now ~860 lines).
- Migrate deprecated RN-web shadow* props to boxShadow (non-blocking warning).

## Update (June 2026) — Phase 2 Enhancements (tested — testing_agent iteration_2 all pass)
- **Theme system**: new `src/budget/theme.ts` (LIGHT/DARK `Palette`, `ThemeContext`, `useTheme`). `_layout.tsx` now hosts `ThemeContext.Provider`, persists mode under storage key `mp-theme`. All budget components + `index.tsx` converted from static `StyleSheet.create` to `makeStyles(c)` factories (theme-aware). Brand greens/hero stay constant across modes.
- **Dark mode**: manual toggle in Budget → Appearance (`dark-mode-switch`).
- **Income tracking**: new `Income` type + `income[]` in storage. `IncomeModal.tsx` (add/list/delete this month's income). Overview `income-card` shows monthly income + opens modal.
- **Remaining mode (user-selectable)**: `remainingMode` = `budget` | `cashflow`, segmented control in Budget (`mode-budget`/`mode-cashflow`). cashflow → remaining = monthIncome − spent (hero "CASH LEFT THIS MONTH"); budget → effectiveBudget − spent.
- **Savings goals**: new `Goal` type + `goals[]`. New `goals` tab (4-tab bar now). `GoalsPanel.tsx` + `GoalEditor.tsx`. Allocation is DERIVED & automatic: `savingsPool` = sum of positive leftover budget for each COMPLETED past month; goals fill in array order (each goal.saved = min(target, remaining pool)). `unallocatedPool` shown as waiting for a new goal.
- **Onboarding**: `Onboarding.tsx` 3-step first-run (welcome → budget → currency). Gated by `mp-onboarded` flag (existing users with data are auto-marked onboarded).
- **Backup**: `BackupData` + export/import now include income, goals, remainingMode.

## Backlog (remaining, prioritized)
- P2 Multiple accounts/wallets — Cash/Card/Bank balances.
- P2 Yearly overview — 12-month view, best-saving months, averages.
- P2 Quick-add presets — one-tap re-log common expenses.
- P3 Home screen widget — remaining budget (needs native build).
