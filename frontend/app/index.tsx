import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, isSameMonth, parseISO } from "date-fns";

import { storage } from "@/src/utils/storage";
import {
  Category,
  Currency,
  CURRENCIES,
  DEFAULT_CATEGORIES,
  Draft,
  Expense,
  Goal,
  Income,
  MonthBar,
  RecurringRule,
  RemainingMode,
  STORAGE_KEY,
  BackupData,
  catMeta,
  money,
  setCurrencySymbol,
} from "@/src/budget/shared";
import { Palette, useTheme } from "@/src/budget/theme";
import ExpenseModal from "@/src/budget/ExpenseModal";
import BudgetPanel from "@/src/budget/BudgetPanel";
import HistoryPanel from "@/src/budget/HistoryPanel";
import InsightsCard from "@/src/budget/InsightsCard";
import DonutChart from "@/src/budget/DonutChart";
import IncomeModal from "@/src/budget/IncomeModal";
import GoalsPanel from "@/src/budget/GoalsPanel";
import Onboarding from "@/src/budget/Onboarding";

const ONBOARD_KEY = "mp-onboarded";
type Tab = "home" | "history" | "budget" | "goals";

export default function Index() {
  const { c, mode, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [budget, setBudget] = useState(3000);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rollover, setRollover] = useState(false);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [income, setIncome] = useState<Income[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [remainingMode, setRemainingMode] = useState<RemainingMode>("budget");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  setCurrencySymbol(currency.symbol);

  const [showExpense, setShowExpense] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2200);
  }, [toastAnim]);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(STORAGE_KEY, "");
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setBudget(data.budget ?? 3000);
          setLimits(data.limits ?? {});
          setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
          setRollover(data.rollover === true);
          setRecurring(Array.isArray(data.recurring) ? data.recurring : []);
          setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES);
          setCurrency(data.currency && data.currency.symbol ? data.currency : CURRENCIES[0]);
          setIncome(Array.isArray(data.income) ? data.income : []);
          setGoals(Array.isArray(data.goals) ? data.goals : []);
          setRemainingMode(data.remainingMode === "cashflow" ? "cashflow" : "budget");
          setOnboarded(true);
        } catch {
          await storage.removeItem(STORAGE_KEY);
        }
      } else {
        const flag = await storage.getItem<boolean>(ONBOARD_KEY, false);
        setOnboarded(flag === true);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ budget, limits, expenses, rollover, recurring, categories, currency, income, goals, remainingMode }),
      );
    }
  }, [budget, limits, expenses, rollover, recurring, categories, currency, income, goals, remainingMode, loaded]);

  // Auto-add recurring expenses that are due this month.
  useEffect(() => {
    if (!loaded || recurring.length === 0) return;
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const due = recurring.filter((rule) => {
      const day = Math.min(rule.dayOfMonth, daysInMonth);
      if (day > today.getDate()) return false;
      return !expenses.some((e) => e.recurringId === rule.id && isSameMonth(parseISO(e.date), today));
    });
    if (due.length === 0) return;
    const added: Expense[] = due.map((rule, i) => ({
      id: `${Date.now()}-${i}-${rule.id}`,
      amount: rule.amount,
      category: rule.category,
      note: rule.note,
      payment: rule.payment,
      date: new Date(today.getFullYear(), today.getMonth(), Math.min(rule.dayOfMonth, daysInMonth), 12).toISOString(),
      recurringId: rule.id,
    }));
    setExpenses((cur) => [...added, ...cur]);
    showToast(added.length === 1 ? "Recurring expense added" : `${added.length} recurring expenses added`);
  }, [loaded, recurring, expenses, showToast]);

  const now = new Date();
  const monthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(parseISO(e.date), now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  );
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthIncome = useMemo(
    () => income.filter((i) => isSameMonth(parseISO(i.date), now)).reduce((s, i) => s + i.amount, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [income],
  );

  // Budget rollover: carry last month's leftover (or overspend) into this month.
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rolloverAmount = useMemo(() => {
    if (!rollover) return 0;
    const prev = expenses.filter((e) => isSameMonth(parseISO(e.date), prevMonth));
    if (prev.length === 0) return 0;
    return budget - prev.reduce((s, e) => s + e.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollover, expenses, budget]);
  const effectiveBudget = budget + rolloverAmount;

  const cashflow = remainingMode === "cashflow";
  const remBase = cashflow ? monthIncome : effectiveBudget;
  const remaining = remBase - spent;
  const daysLeft = Math.max(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1,
    1,
  );
  const safe = Math.max(remaining, 0) / daysLeft;
  const spentToday = monthExpenses
    .filter((e) => isSameDay(parseISO(e.date), now))
    .reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(
    () =>
      categories.map((cat) => ({
        category: cat.name,
        amount: monthExpenses.filter((e) => e.category === cat.name).reduce((s, e) => s + e.amount, 0),
        limit: limits[cat.name] || 0,
        color: cat.color,
      })).filter((x) => x.amount > 0 || x.limit > 0),
    [monthExpenses, limits, categories],
  );

  const alerts = byCategory.filter((cat) => cat.limit > 0 && cat.amount / cat.limit >= 0.8);

  const history = useMemo(() => {
    const arr: MonthBar[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = expenses
        .filter((e) => isSameMonth(parseISO(e.date), d))
        .reduce((s, e) => s + e.amount, 0);
      arr.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM"), total, isCurrent: i === 0 });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  // Savings pool = sum of positive leftover budget for every completed past month.
  const savingsPool = useMemo(() => {
    const curKey = format(now, "yyyy-MM");
    const keys = new Set(expenses.map((e) => format(parseISO(e.date), "yyyy-MM")));
    let pool = 0;
    keys.forEach((k) => {
      if (k >= curKey) return;
      const sp = expenses
        .filter((e) => format(parseISO(e.date), "yyyy-MM") === k)
        .reduce((s, e) => s + e.amount, 0);
      pool += Math.max(budget - sp, 0);
    });
    return pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, budget]);

  const { goalsWithSaved, unallocatedPool } = useMemo(() => {
    let rem = savingsPool;
    const list = goals.map((g) => {
      const saved = Math.min(g.target, Math.max(rem, 0));
      rem -= saved;
      return { ...g, saved };
    });
    return { goalsWithSaved: list, unallocatedPool: Math.max(rem, 0) };
  }, [goals, savingsPool]);

  const openAdd = () => {
    setEditing(null);
    setShowExpense(true);
  };
  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setShowExpense(true);
  };
  const saveExpense = (draft: Draft, repeatMonthly: boolean) => {
    if (editing) {
      setExpenses((cur) => cur.map((e) => (e.id === editing.id ? { ...editing, ...draft } : e)));
      showToast("Expense updated");
    } else {
      const id = Date.now().toString();
      if (repeatMonthly) {
        const ruleId = `r-${id}`;
        setRecurring((cur) => [
          ...cur,
          {
            id: ruleId,
            amount: draft.amount,
            category: draft.category,
            note: draft.note,
            payment: draft.payment,
            dayOfMonth: parseISO(draft.date).getDate(),
          },
        ]);
        setExpenses((cur) => [{ ...draft, id, recurringId: ruleId }, ...cur]);
        showToast("Expense added · repeats monthly");
      } else {
        setExpenses((cur) => [{ ...draft, id }, ...cur]);
        showToast("Expense added");
      }
    }
    setShowExpense(false);
    setEditing(null);
  };
  const confirmDelete = () => {
    if (!confirmId) return;
    setExpenses((cur) => cur.filter((e) => e.id !== confirmId));
    setConfirmId(null);
    setShowExpense(false);
    setEditing(null);
    showToast("Expense deleted");
  };
  const deleteRecurring = (id: string) => {
    setRecurring((cur) => cur.filter((r) => r.id !== id));
    showToast("Recurring expense stopped");
  };
  const saveBudget = (value: number, nextLimits: Record<string, number>, nextRollover: boolean) => {
    setBudget(value);
    setLimits(nextLimits);
    setRollover(nextRollover);
    showToast("Budget saved");
  };
  const changeCurrency = (nextCurrency: Currency) => {
    setCurrency(nextCurrency);
    showToast(`Currency set to ${nextCurrency.code}`);
  };
  const changeRemainingMode = (m: RemainingMode) => {
    setRemainingMode(m);
    showToast(m === "cashflow" ? "Now based on cash flow" : "Now based on budget");
  };
  const addIncome = (draft: Omit<Income, "id">) => {
    setIncome((cur) => [{ ...draft, id: `i-${Date.now()}` }, ...cur]);
    showToast("Income added");
  };
  const deleteIncome = (id: string) => {
    setIncome((cur) => cur.filter((i) => i.id !== id));
    showToast("Income removed");
  };
  const saveGoal = (goal: Omit<Goal, "id">, id?: string) => {
    if (id) {
      setGoals((cur) => cur.map((g) => (g.id === id ? { ...g, ...goal } : g)));
      showToast("Goal updated");
    } else {
      setGoals((cur) => [...cur, { ...goal, id: `g-${Date.now()}` }]);
      showToast("Goal added");
    }
  };
  const deleteGoal = (id: string) => {
    setGoals((cur) => cur.filter((g) => g.id !== id));
    showToast("Goal removed");
  };
  const importData = (data: BackupData) => {
    setBudget(data.budget ?? 3000);
    setLimits(data.limits ?? {});
    setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
    setRollover(data.rollover === true);
    setRecurring(Array.isArray(data.recurring) ? data.recurring : []);
    setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES);
    setCurrency(data.currency && data.currency.symbol ? data.currency : CURRENCIES[0]);
    setIncome(Array.isArray(data.income) ? data.income : []);
    setGoals(Array.isArray(data.goals) ? data.goals : []);
    setRemainingMode(data.remainingMode === "cashflow" ? "cashflow" : "budget");
    showToast("Backup restored");
  };
  const finishOnboarding = (b: number, cur: Currency) => {
    setBudget(b > 0 ? b : 3000);
    setCurrency(cur);
    setOnboarded(true);
    storage.setItem(ONBOARD_KEY, true);
    showToast("You’re all set 🌱");
  };
  const addCategory = (cat: Category) => {
    setCategories((cur) => [...cur, cat]);
    showToast("Category added");
  };
  const updateCategory = (oldName: string, cat: Category) => {
    setCategories((cur) => cur.map((x) => (x.name === oldName ? cat : x)));
    if (oldName !== cat.name) {
      setExpenses((cur) => cur.map((e) => (e.category === oldName ? { ...e, category: cat.name } : e)));
      setRecurring((cur) => cur.map((r) => (r.category === oldName ? { ...r, category: cat.name } : r)));
      setLimits((cur) => {
        if (cur[oldName] === undefined) return cur;
        const { [oldName]: v, ...rest } = cur;
        return { ...rest, [cat.name]: v };
      });
    }
    showToast("Category updated");
  };
  const deleteCategory = (name: string) => {
    setCategories((cur) => (cur.length > 1 ? cur.filter((x) => x.name !== name) : cur));
    setLimits((cur) => {
      const { [name]: _removed, ...rest } = cur;
      return rest;
    });
    showToast("Category removed");
  };

  const overBudget = remaining < 0;
  const pct = remBase > 0 ? Math.min((spent / remBase) * 100, 100) : 0;
  const isMonthEnd = daysLeft <= 5 && monthExpenses.length > 0;

  const backup: BackupData = { budget, limits, expenses, rollover, recurring, categories, currency, income, goals, remainingMode };

  const headerTitle =
    activeTab === "home"
      ? "Your month, in balance"
      : activeTab === "history"
        ? "Spending over time"
        : activeTab === "goals"
          ? "Savings goals"
          : "Budget settings";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MONTHLYPULSE</Text>
            <Text style={styles.title}>{headerTitle}</Text>
          </View>
          <Pressable testID="settings-button" onPress={() => setShowBudget(true)} style={styles.iconButton}>
            <Ionicons name="options-outline" size={22} color={c.primary} />
          </Pressable>
        </View>

        {activeTab === "home" && (
          <>
            <View style={[styles.heroCard, overBudget && styles.heroCardOver]}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.cardLabel}>
                    {overBudget
                      ? cashflow ? "OVERSPENT BY" : "OVER BUDGET BY"
                      : cashflow ? "CASH LEFT THIS MONTH" : "REMAINING THIS MONTH"}
                  </Text>
                  <Text testID="remaining-amount" style={styles.remaining}>{money(Math.abs(remaining))}</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={[styles.dot, overBudget && { backgroundColor: "#FFD6C7" }]} />
                  <Text style={styles.statusText}>{overBudget ? "Over" : "On track"}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progress, { width: `${pct}%` }, overBudget && { backgroundColor: "#FFB59E" }]} />
              </View>
              <View style={styles.heroBottom}>
                <Text style={styles.heroMuted}>{money(spent)} spent</Text>
                <Text style={styles.heroMuted}>
                  {cashflow ? `${money(monthIncome)} income` : `${money(effectiveBudget)} monthly budget`}
                </Text>
              </View>
              {rolloverAmount !== 0 && !cashflow && (
                <View style={styles.rolloverPill}>
                  <Ionicons name="arrow-redo-outline" size={13} color="#D8F3E3" />
                  <Text testID="rollover-note" style={styles.rolloverText}>
                    Includes {rolloverAmount > 0 ? "+" : "−"}{money(Math.abs(rolloverAmount))} rollover from {format(prevMonth, "MMMM")}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.safeCard}>
              <View style={styles.safeIcon}>
                <Ionicons name="sunny-outline" size={23} color={c.warnIcon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabelDark}>SAFE TO SPEND TODAY</Text>
                <Text testID="safe-to-spend" style={styles.safeAmount}>{money(safe)}</Text>
                <Text style={styles.muted}>
                  {money(spentToday)} spent today · {daysLeft} days left
                </Text>
              </View>
            </View>

            <Pressable testID="income-card" onPress={() => setShowIncome(true)} style={styles.incomeCard}>
              <View style={styles.incomeIcon}>
                <Ionicons name="trending-up-outline" size={22} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabelDark}>INCOME THIS MONTH</Text>
                <Text testID="income-total" style={styles.incomeAmount}>{money(monthIncome)}</Text>
              </View>
              <View testID="open-income-button" style={styles.incomeAdd}>
                <Ionicons name="add" size={18} color={c.dark ? "#0E140D" : "#FFFFFF"} />
                <Text style={styles.incomeAddText}>Log</Text>
              </View>
            </Pressable>

            {isMonthEnd && (
              <View
                testID="month-recap-card"
                style={[styles.recapCard, overBudget ? styles.recapCardOver : styles.recapCardGood]}
              >
                <View style={[styles.recapIcon, overBudget ? styles.recapIconOver : styles.recapIconGood]}>
                  <Ionicons name={overBudget ? "refresh-outline" : "leaf-outline"} size={20} color={overBudget ? c.heroOver : c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapTitle}>{overBudget ? "Month-end check-in" : "You’re finishing strong 🌱"}</Text>
                  <Text testID="month-recap-text" style={styles.recapText}>
                    {overBudget
                      ? `You went ${money(Math.abs(remaining))} over this month. Next month is a fresh start.`
                      : `With ${daysLeft} day${daysLeft === 1 ? "" : "s"} left, you have ${money(remaining)} to spare — nicely under budget.`}
                  </Text>
                </View>
              </View>
            )}

            {alerts.length > 0 && (
              <View testID="category-alerts" style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color={c.warnIcon} />
                  <Text style={styles.alertTitle}>Heads up on your limits</Text>
                </View>
                {alerts.map((a) => {
                  const ratio = a.amount / a.limit;
                  const over = ratio > 1;
                  return (
                    <Text key={a.category} testID={`alert-${a.category}`} style={styles.alertText}>
                      {over ? "You’ve passed" : "You’re close to"} your {a.category} limit — {money(a.amount)} of {money(a.limit)}.
                    </Text>
                  );
                })}
              </View>
            )}

            {monthExpenses.length > 0 && <InsightsCard expenses={expenses} effectiveBudget={effectiveBudget} />}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Spending snapshot</Text>
              <Text style={styles.month}>{format(now, "MMMM yyyy")}</Text>
            </View>
            <View style={styles.chartCard}>
              {byCategory.some((cat) => cat.amount > 0) ? (
                <>
                  <DonutChart
                    segments={byCategory
                      .filter((cat) => cat.amount > 0)
                      .map((cat) => ({ label: cat.category, value: cat.amount, color: cat.color }))}
                    centerValue={money(spent)}
                    centerLabel="spent"
                  />
                  <View style={styles.legend}>
                    {byCategory
                      .filter((cat) => cat.amount > 0)
                      .slice(0, 6)
                      .map((item) => (
                        <View key={item.category} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                          <Text style={styles.legendText}>
                            {item.category} {money(item.amount)}
                          </Text>
                        </View>
                      ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons name="pie-chart-outline" size={28} color={c.accentSoft} />
                  <Text style={styles.emptyTitle}>Your spending story starts here</Text>
                  <Text style={styles.muted}>Add an expense to see your categories grow.</Text>
                </View>
              )}
            </View>

            {byCategory.some((cat) => cat.limit > 0) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Category limits</Text>
                </View>
                <View style={styles.chartCard}>
                  {byCategory
                    .filter((cat) => cat.limit > 0)
                    .map((item) => {
                      const ratio = item.limit > 0 ? item.amount / item.limit : 0;
                      const barColor = ratio > 1 ? c.danger : ratio >= 0.8 ? c.warnIcon : item.color;
                      return (
                        <View key={item.category} testID={`limit-progress-${item.category}`} style={styles.limitProgressRow}>
                          <View style={styles.limitProgressTop}>
                            <Text style={styles.limitProgressName}>{item.category}</Text>
                            <Text style={[styles.limitProgressValue, ratio > 1 && { color: c.danger }]}>
                              {money(item.amount)} / {money(item.limit)}
                            </Text>
                          </View>
                          <View style={styles.limitTrack}>
                            <View style={[styles.limitFill, { width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: barColor }]} />
                          </View>
                        </View>
                      );
                    })}
                </View>
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent expenses</Text>
              <Text style={styles.month}>{monthExpenses.length} this month</Text>
            </View>
            <View style={styles.expenseCard}>
              {monthExpenses.length ? (
                monthExpenses.slice(0, 6).map((item, idx, arr) => {
                  const meta = catMeta(item.category, categories);
                  return (
                    <Pressable
                      testID={`expense-${item.id}`}
                      key={item.id}
                      onPress={() => openEdit(item)}
                      onLongPress={() => setConfirmId(item.id)}
                      style={[styles.expenseRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: `${meta.color}22` }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.expenseName}>{item.note || item.category}</Text>
                          {item.recurringId && <Ionicons name="repeat-outline" size={14} color={c.accent} />}
                        </View>
                        <Text style={styles.muted}>
                          {item.category} · {format(parseISO(item.date), "MMM d")} · {item.payment}
                        </Text>
                      </View>
                      <Text style={styles.expenseAmount}>-{money(item.amount)}</Text>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptyExpenses}>
                  <Text style={styles.emptyTitle}>No expenses yet</Text>
                  <Text style={styles.muted}>Tap the button below whenever you spend.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === "history" && (
          <HistoryPanel
            history={history}
            expenses={expenses}
            categories={categories}
            onEdit={openEdit}
            onDelete={(id) => setConfirmId(id)}
          />
        )}

        {activeTab === "goals" && (
          <GoalsPanel
            goals={goalsWithSaved}
            pool={savingsPool}
            unallocated={unallocatedPool}
            onSaveGoal={saveGoal}
            onDeleteGoal={deleteGoal}
          />
        )}

        {activeTab === "budget" && (
          <BudgetPanel
            budget={budget}
            limits={limits}
            rollover={rollover}
            recurring={recurring}
            categories={categories}
            currency={currency}
            currencies={CURRENCIES}
            backup={backup}
            remainingMode={remainingMode}
            themeMode={mode}
            onDeleteRecurring={deleteRecurring}
            onChangeCurrency={changeCurrency}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onImport={importData}
            onToast={showToast}
            onChangeRemainingMode={changeRemainingMode}
            onToggleTheme={toggle}
            onSave={(value, nextLimits, nextRollover) => {
              saveBudget(value, nextLimits, nextRollover);
              setActiveTab("home");
            }}
          />
        )}
      </ScrollView>

      {activeTab === "home" && (
        <Pressable
          testID="add-expense-button"
          onPress={openAdd}
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
        >
          <Ionicons name="add" size={26} color={c.dark ? "#0E140D" : "#FFFFFF"} />
          <Text style={styles.fabText}>Add expense</Text>
        </Pressable>
      )}

      <View style={styles.tabs}>
        <Pressable testID="home-tab" onPress={() => setActiveTab("home")} style={styles.tab}>
          <Ionicons name="grid-outline" size={21} color={activeTab === "home" ? c.primary : c.placeholder} />
          <Text style={[styles.tabText, activeTab === "home" && styles.tabActive]}>Overview</Text>
        </Pressable>
        <Pressable testID="history-tab" onPress={() => setActiveTab("history")} style={styles.tab}>
          <Ionicons name="trending-up-outline" size={21} color={activeTab === "history" ? c.primary : c.placeholder} />
          <Text style={[styles.tabText, activeTab === "history" && styles.tabActive]}>History</Text>
        </Pressable>
        <Pressable testID="goals-tab" onPress={() => setActiveTab("goals")} style={styles.tab}>
          <Ionicons name="flag-outline" size={21} color={activeTab === "goals" ? c.primary : c.placeholder} />
          <Text style={[styles.tabText, activeTab === "goals" && styles.tabActive]}>Goals</Text>
        </Pressable>
        <Pressable testID="budget-tab" onPress={() => setActiveTab("budget")} style={styles.tab}>
          <Ionicons name="leaf-outline" size={21} color={activeTab === "budget" ? c.primary : c.placeholder} />
          <Text style={[styles.tabText, activeTab === "budget" && styles.tabActive]}>Budget</Text>
        </Pressable>
      </View>

      <ExpenseModal
        visible={showExpense}
        editing={editing}
        categories={categories}
        onClose={() => {
          setShowExpense(false);
          setEditing(null);
        }}
        onSave={saveExpense}
        onDelete={(id) => setConfirmId(id)}
      />

      <IncomeModal
        visible={showIncome}
        income={income}
        onAdd={addIncome}
        onDelete={deleteIncome}
        onClose={() => setShowIncome(false)}
      />

      <Modal visible={showBudget} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <BudgetPanel
                budget={budget}
                limits={limits}
                rollover={rollover}
                recurring={recurring}
                categories={categories}
                currency={currency}
                currencies={CURRENCIES}
                backup={backup}
                remainingMode={remainingMode}
                themeMode={mode}
                onDeleteRecurring={deleteRecurring}
                onChangeCurrency={changeCurrency}
                onAddCategory={addCategory}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
                onImport={importData}
                onToast={showToast}
                onChangeRemainingMode={changeRemainingMode}
                onToggleTheme={toggle}
                onSave={(value, nextLimits, nextRollover) => {
                  saveBudget(value, nextLimits, nextRollover);
                  setShowBudget(false);
                }}
              />
              <Pressable onPress={() => setShowBudget(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmId} animationType="fade" transparent>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={24} color={c.danger} />
            </View>
            <Text style={styles.confirmTitle}>Delete this expense?</Text>
            <Text style={styles.confirmBody}>It will be removed from your monthly total. This can’t be undone.</Text>
            <Pressable testID="confirm-delete-button" onPress={confirmDelete} style={styles.dangerButton}>
              <Text style={styles.dangerText}>Delete</Text>
            </Pressable>
            <Pressable testID="cancel-delete-button" onPress={() => setConfirmId(null)} style={styles.confirmCancel}>
              <Text style={styles.confirmCancelText}>Keep it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Onboarding visible={loaded && !onboarded} currencies={CURRENCIES} onComplete={finishOnboarding} />

      {toast && (
        <Animated.View
          testID="toast"
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color={c.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { padding: 24, paddingBottom: 150 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: c.accent, marginBottom: 8 },
    title: { color: c.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
    iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, shadowColor: c.hero, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
    heroCardOver: { backgroundColor: c.heroOver },
    heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    cardLabel: { color: "#A9DDBF", fontSize: 11, letterSpacing: 1.3, fontWeight: "700" },
    cardLabelDark: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700" },
    remaining: { color: "#FFFFFF", fontSize: 38, fontWeight: "700", marginTop: 8 },
    statusPill: { backgroundColor: "#FFFFFF22", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center" },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#95D5B2", marginRight: 6 },
    statusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
    progressTrack: { height: 8, backgroundColor: "#FFFFFF26", borderRadius: 4, marginTop: 26, overflow: "hidden" },
    progress: { height: "100%", backgroundColor: "#95D5B2", borderRadius: 4 },
    heroBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    heroMuted: { color: "#D8F3E3", fontSize: 13 },
    rolloverPill: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "#FFFFFF1A", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
    rolloverText: { color: "#D8F3E3", fontSize: 12, fontWeight: "600" },
    muted: { color: c.textMuted, fontSize: 13 },
    safeCard: { marginTop: 16, padding: 18, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 13 },
    safeIcon: { backgroundColor: c.warnIconBg, width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    safeAmount: { color: c.text, fontSize: 24, fontWeight: "700", marginTop: 3, marginBottom: 2 },
    incomeCard: { marginTop: 16, padding: 18, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 13 },
    incomeIcon: { backgroundColor: c.surfaceTint, width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    incomeAmount: { color: c.text, fontSize: 24, fontWeight: "700", marginTop: 3 },
    incomeAdd: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.primary, borderRadius: 14, paddingHorizontal: 14, height: 40 },
    incomeAddText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 14, fontWeight: "700" },
    recapCard: { marginTop: 16, flexDirection: "row", alignItems: "flex-start", gap: 13, borderRadius: 20, borderWidth: 1, padding: 16 },
    recapCardGood: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    recapCardOver: { backgroundColor: c.dangerSoft, borderColor: c.warnBorder },
    recapIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    recapIconGood: { backgroundColor: c.dark ? "#25382B" : "#D8F0E1" },
    recapIconOver: { backgroundColor: c.dark ? "#4A2822" : "#F9D9D2" },
    recapTitle: { color: c.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
    recapText: { color: c.textLabel, fontSize: 13, lineHeight: 19 },
    alertCard: { marginTop: 16, backgroundColor: c.warnBg, borderColor: c.warnBorder, borderWidth: 1, borderRadius: 18, padding: 16 },
    alertHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
    alertTitle: { color: c.warnText, fontSize: 14, fontWeight: "700" },
    alertText: { color: c.warnText, fontSize: 13, lineHeight: 20, marginBottom: 2 },
    sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 30, marginBottom: 12 },
    sectionTitle: { color: c.text, fontSize: 19, fontWeight: "700" },
    month: { color: c.textMuted, fontSize: 12 },
    chartCard: { backgroundColor: c.surface, borderRadius: 20, padding: 20, borderColor: c.border, borderWidth: 1 },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: c.border, justifyContent: "center" },
    legendItem: { flexDirection: "row", alignItems: "center" },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    legendText: { color: c.textLabel, fontSize: 12 },
    emptyChart: { alignItems: "center", paddingVertical: 26, gap: 8 },
    emptyTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    limitProgressRow: { marginBottom: 16 },
    limitProgressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    limitProgressName: { color: c.text, fontSize: 14, fontWeight: "600" },
    limitProgressValue: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    limitTrack: { height: 8, backgroundColor: c.surface2, borderRadius: 4, overflow: "hidden" },
    limitFill: { height: "100%", borderRadius: 4 },
    expenseCard: { backgroundColor: c.surface, borderRadius: 20, borderColor: c.border, borderWidth: 1, paddingHorizontal: 16 },
    expenseRow: { minHeight: 72, flexDirection: "row", alignItems: "center", borderBottomColor: c.border, borderBottomWidth: 1, gap: 12 },
    categoryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    expenseName: { color: c.text, fontSize: 15, fontWeight: "600" },
    expenseAmount: { color: c.dangerText, fontSize: 15, fontWeight: "700" },
    emptyExpenses: { alignItems: "center", paddingVertical: 26, gap: 7 },
    fab: { position: "absolute", bottom: 82, right: 24, height: 54, paddingHorizontal: 19, borderRadius: 27, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", gap: 7, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
    fabText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontWeight: "700", fontSize: 15 },
    tabs: { position: "absolute", bottom: 0, left: 0, right: 0, height: 68, backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingTop: 10 },
    tab: { alignItems: "center", minWidth: 60, gap: 4 },
    tabText: { color: c.placeholder, fontSize: 12, fontWeight: "600" },
    tabActive: { color: c.primary },
    modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: c.overlay },
    sheet: { maxHeight: "92%", backgroundColor: c.bgAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    closeButton: { alignItems: "center", padding: 15 },
    closeText: { color: c.primary, fontWeight: "700" },
    confirmBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.overlay, padding: 32 },
    confirmCard: { backgroundColor: c.surface, borderRadius: 24, padding: 24, width: "100%", alignItems: "center" },
    confirmIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    confirmTitle: { color: c.text, fontSize: 19, fontWeight: "700", marginBottom: 8 },
    confirmBody: { color: c.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
    dangerButton: { height: 52, borderRadius: 16, backgroundColor: c.danger, alignItems: "center", justifyContent: "center", width: "100%" },
    dangerText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    confirmCancel: { paddingVertical: 14 },
    confirmCancelText: { color: c.textLabel, fontSize: 15, fontWeight: "600" },
    toast: { position: "absolute", top: 60, alignSelf: "center", backgroundColor: c.toastBg, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    toastText: { color: c.toastText, fontSize: 14, fontWeight: "600" },
  });
