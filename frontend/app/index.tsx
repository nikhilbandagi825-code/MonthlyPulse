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
  MonthBar,
  RecurringRule,
  STORAGE_KEY,
  BackupData,
  catMeta,
  money,
  setCurrencySymbol,
} from "@/src/budget/shared";
import ExpenseModal from "@/src/budget/ExpenseModal";
import BudgetPanel from "@/src/budget/BudgetPanel";
import HistoryPanel from "@/src/budget/HistoryPanel";
import InsightsCard from "@/src/budget/InsightsCard";
import DonutChart from "@/src/budget/DonutChart";

export default function Index() {
  const [budget, setBudget] = useState(3000);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rollover, setRollover] = useState(false);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "budget">("home");
  const [loaded, setLoaded] = useState(false);

  setCurrencySymbol(currency.symbol);

  const [showExpense, setShowExpense] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showBudget, setShowBudget] = useState(false);
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
        } catch {
          await storage.removeItem(STORAGE_KEY);
        }
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ budget, limits, expenses, rollover, recurring, categories, currency }));
    }
  }, [budget, limits, expenses, rollover, recurring, categories, currency, loaded]);

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
    [expenses],
  );
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Budget rollover: carry last month's leftover (or overspend) into this month.
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rolloverAmount = useMemo(() => {
    if (!rollover) return 0;
    const prev = expenses.filter((e) => isSameMonth(parseISO(e.date), prevMonth));
    if (prev.length === 0) return 0;
    return budget - prev.reduce((s, e) => s + e.amount, 0);
  }, [rollover, expenses, budget]);
  const effectiveBudget = budget + rolloverAmount;

  const remaining = effectiveBudget - spent;
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
      categories.map((c) => ({
        category: c.name,
        amount: monthExpenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0),
        limit: limits[c.name] || 0,
        color: c.color,
      })).filter((x) => x.amount > 0 || x.limit > 0),
    [monthExpenses, limits, categories],
  );

  const alerts = byCategory.filter((c) => c.limit > 0 && c.amount / c.limit >= 0.8);

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
  }, [expenses]);

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
  const importData = (data: BackupData) => {
    setBudget(data.budget ?? 3000);
    setLimits(data.limits ?? {});
    setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
    setRollover(data.rollover === true);
    setRecurring(Array.isArray(data.recurring) ? data.recurring : []);
    setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES);
    setCurrency(data.currency && data.currency.symbol ? data.currency : CURRENCIES[0]);
    showToast("Backup restored");
  };
  const addCategory = (cat: Category) => {
    setCategories((cur) => [...cur, cat]);
    showToast("Category added");
  };
  const updateCategory = (oldName: string, cat: Category) => {
    setCategories((cur) => cur.map((c) => (c.name === oldName ? cat : c)));
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
    setCategories((cur) => (cur.length > 1 ? cur.filter((c) => c.name !== name) : cur));
    setLimits((cur) => {
      const { [name]: _removed, ...rest } = cur;
      return rest;
    });
    showToast("Category removed");
  };

  const overBudget = remaining < 0;
  const pct = effectiveBudget > 0 ? Math.min((spent / effectiveBudget) * 100, 100) : 0;

  const isMonthEnd = daysLeft <= 5 && monthExpenses.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SERENEBUDGET</Text>
            <Text style={styles.title}>
              {activeTab === "home" ? "Your month, in balance" : activeTab === "history" ? "Spending over time" : "Budget settings"}
            </Text>
          </View>
          <Pressable testID="settings-button" onPress={() => setShowBudget(true)} style={styles.iconButton}>
            <Ionicons name="options-outline" size={22} color="#2D6A4F" />
          </Pressable>
        </View>

        {activeTab === "home" && (
          <>
            <View style={[styles.heroCard, overBudget && styles.heroCardOver]}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.cardLabel}>{overBudget ? "OVER BUDGET BY" : "REMAINING THIS MONTH"}</Text>
                  <Text testID="remaining-amount" style={styles.remaining}>{money(Math.abs(remaining))}</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={[styles.dot, overBudget && { backgroundColor: "#FFD6C7" }]} />
                  <Text style={styles.statusText}>{overBudget ? "Over budget" : "On track"}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progress, { width: `${pct}%` }, overBudget && { backgroundColor: "#FFB59E" }]} />
              </View>
              <View style={styles.heroBottom}>
                <Text style={styles.heroMuted}>{money(spent)} spent</Text>
                <Text style={styles.heroMuted}>{money(effectiveBudget)} monthly budget</Text>
              </View>
              {rolloverAmount !== 0 && (
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
                <Ionicons name="sunny-outline" size={23} color="#B86B22" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabelDark}>SAFE TO SPEND TODAY</Text>
                <Text testID="safe-to-spend" style={styles.safeAmount}>{money(safe)}</Text>
                <Text style={styles.muted}>
                  {money(spentToday)} spent today · {daysLeft} days left
                </Text>
              </View>
            </View>

            {isMonthEnd && (
              <View
                testID="month-recap-card"
                style={[styles.recapCard, overBudget ? styles.recapCardOver : styles.recapCardGood]}
              >
                <View style={[styles.recapIcon, overBudget ? styles.recapIconOver : styles.recapIconGood]}>
                  <Ionicons
                    name={overBudget ? "refresh-outline" : "leaf-outline"}
                    size={20}
                    color={overBudget ? "#B5482F" : "#2D6A4F"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapTitle}>
                    {overBudget ? "Month-end check-in" : "You’re finishing strong 🌱"}
                  </Text>
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
                  <Ionicons name="alert-circle-outline" size={18} color="#B86B22" />
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

            {monthExpenses.length > 0 && (
              <InsightsCard expenses={expenses} effectiveBudget={effectiveBudget} />
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Spending snapshot</Text>
              <Text style={styles.month}>{format(now, "MMMM yyyy")}</Text>
            </View>
            <View style={styles.chartCard}>
              {byCategory.some((c) => c.amount > 0) ? (
                <>
                  <DonutChart
                    segments={byCategory
                      .filter((c) => c.amount > 0)
                      .map((c) => ({ label: c.category, value: c.amount, color: c.color }))}
                    centerValue={money(spent)}
                    centerLabel="spent"
                  />
                  <View style={styles.legend}>
                    {byCategory
                      .filter((c) => c.amount > 0)
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
                  <Ionicons name="pie-chart-outline" size={28} color="#95D5B2" />
                  <Text style={styles.emptyTitle}>Your spending story starts here</Text>
                  <Text style={styles.muted}>Add an expense to see your categories grow.</Text>
                </View>
              )}
            </View>

            {byCategory.some((c) => c.limit > 0) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Category limits</Text>
                </View>
                <View style={styles.chartCard}>
                  {byCategory
                    .filter((c) => c.limit > 0)
                    .map((item) => {
                      const ratio = item.limit > 0 ? item.amount / item.limit : 0;
                      const barColor = ratio > 1 ? "#D90429" : ratio >= 0.8 ? "#F4A261" : item.color;
                      return (
                        <View key={item.category} testID={`limit-progress-${item.category}`} style={styles.limitProgressRow}>
                          <View style={styles.limitProgressTop}>
                            <Text style={styles.limitProgressName}>{item.category}</Text>
                            <Text style={[styles.limitProgressValue, ratio > 1 && { color: "#D90429" }]}>
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
                        {item.recurringId && <Ionicons name="repeat-outline" size={14} color="#52B788" />}
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

        {activeTab === "budget" && (
          <BudgetPanel
            budget={budget}
            limits={limits}
            rollover={rollover}
            recurring={recurring}
            categories={categories}
            currency={currency}
            currencies={CURRENCIES}
            backup={{ budget, limits, expenses, rollover, recurring, categories, currency }}
            onDeleteRecurring={deleteRecurring}
            onChangeCurrency={changeCurrency}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onImport={importData}
            onToast={showToast}
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
          <Ionicons name="add" size={26} color="#FFFFFF" />
          <Text style={styles.fabText}>Add expense</Text>
        </Pressable>
      )}

      <View style={styles.tabs}>
        <Pressable testID="home-tab" onPress={() => setActiveTab("home")} style={styles.tab}>
          <Ionicons name="grid-outline" size={21} color={activeTab === "home" ? "#2D6A4F" : "#9BAEA1"} />
          <Text style={[styles.tabText, activeTab === "home" && styles.tabActive]}>Overview</Text>
        </Pressable>
        <Pressable testID="history-tab" onPress={() => setActiveTab("history")} style={styles.tab}>
          <Ionicons name="trending-up-outline" size={21} color={activeTab === "history" ? "#2D6A4F" : "#9BAEA1"} />
          <Text style={[styles.tabText, activeTab === "history" && styles.tabActive]}>History</Text>
        </Pressable>
        <Pressable testID="budget-tab" onPress={() => setActiveTab("budget")} style={styles.tab}>
          <Ionicons name="leaf-outline" size={21} color={activeTab === "budget" ? "#2D6A4F" : "#9BAEA1"} />
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
                backup={{ budget, limits, expenses, rollover, recurring, categories, currency }}
                onDeleteRecurring={deleteRecurring}
                onChangeCurrency={changeCurrency}
                onAddCategory={addCategory}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
                onImport={importData}
                onToast={showToast}
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
              <Ionicons name="trash-outline" size={24} color="#D90429" />
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

      {toast && (
        <Animated.View
          testID="toast"
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#95D5B2" />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7F4" },
  container: { padding: 24, paddingBottom: 150 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: "#52B788", marginBottom: 8 },
  title: { color: "#1B2A22", fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EAF4EE", alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: "#2D6A4F", borderRadius: 24, padding: 22, shadowColor: "#2D6A4F", shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  heroCardOver: { backgroundColor: "#B5482F" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLabel: { color: "#A9DDBF", fontSize: 11, letterSpacing: 1.3, fontWeight: "700" },
  cardLabelDark: { color: "#526E5D", fontSize: 11, letterSpacing: 1.2, fontWeight: "700" },
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
  muted: { color: "#6E8577", fontSize: 13 },
  safeCard: { marginTop: 16, padding: 18, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 13 },
  safeIcon: { backgroundColor: "#FFF1DF", width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  safeAmount: { color: "#1B2A22", fontSize: 24, fontWeight: "700", marginTop: 3, marginBottom: 2 },
  recapCard: { marginTop: 16, flexDirection: "row", alignItems: "flex-start", gap: 13, borderRadius: 20, borderWidth: 1, padding: 16 },
  recapCardGood: { backgroundColor: "#EAF4EE", borderColor: "#C5E6D2" },
  recapCardOver: { backgroundColor: "#FCE8E4", borderColor: "#F4CFC6" },
  recapIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  recapIconGood: { backgroundColor: "#D8F0E1" },
  recapIconOver: { backgroundColor: "#F9D9D2" },
  recapTitle: { color: "#1B2A22", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  recapText: { color: "#526E5D", fontSize: 13, lineHeight: 19 },
  alertCard: { marginTop: 16, backgroundColor: "#FFF6EC", borderColor: "#F4D9BC", borderWidth: 1, borderRadius: 18, padding: 16 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  alertTitle: { color: "#8A5219", fontSize: 14, fontWeight: "700" },
  alertText: { color: "#8A5219", fontSize: 13, lineHeight: 20, marginBottom: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 30, marginBottom: 12 },
  sectionTitle: { color: "#1B2A22", fontSize: 19, fontWeight: "700" },
  month: { color: "#6E8577", fontSize: 12 },
  chartCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderColor: "#D8E6DC", borderWidth: 1 },
  bars: { height: 145, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end" },
  barItem: { height: "100%", alignItems: "center", justifyContent: "flex-end", width: 38 },
  barTrack: { height: 112, width: 22, backgroundColor: "#F0F5F1", borderRadius: 11, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 11 },
  barLabel: { color: "#6E8577", fontSize: 10, marginTop: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#EDF3EE", justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: "#526E5D", fontSize: 12 },
  emptyChart: { alignItems: "center", paddingVertical: 26, gap: 8 },
  emptyTitle: { color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  limitProgressRow: { marginBottom: 16 },
  limitProgressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  limitProgressName: { color: "#1B2A22", fontSize: 14, fontWeight: "600" },
  limitProgressValue: { color: "#526E5D", fontSize: 13, fontWeight: "600" },
  limitTrack: { height: 8, backgroundColor: "#F0F5F1", borderRadius: 4, overflow: "hidden" },
  limitFill: { height: "100%", borderRadius: 4 },
  expenseCard: { backgroundColor: "#FFFFFF", borderRadius: 20, borderColor: "#D8E6DC", borderWidth: 1, paddingHorizontal: 16 },
  expenseRow: { minHeight: 72, flexDirection: "row", alignItems: "center", borderBottomColor: "#EDF3EE", borderBottomWidth: 1, gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  expenseName: { color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  expenseAmount: { color: "#D05D46", fontSize: 15, fontWeight: "700" },
  emptyExpenses: { alignItems: "center", paddingVertical: 26, gap: 7 },
  fab: { position: "absolute", bottom: 80, right: 24, height: 54, paddingHorizontal: 19, borderRadius: 27, backgroundColor: "#2D6A4F", flexDirection: "row", alignItems: "center", gap: 7, shadowColor: "#1B4332", shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  tabs: { position: "absolute", bottom: 0, left: 0, right: 0, height: 68, backgroundColor: "#FFFFFF", borderTopColor: "#D8E6DC", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingTop: 10 },
  tab: { alignItems: "center", minWidth: 70, gap: 4 },
  tabText: { color: "#9BAEA1", fontSize: 12, fontWeight: "600" },
  tabActive: { color: "#2D6A4F" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#17332666" },
  sheet: { maxHeight: "92%", backgroundColor: "#F9FCF9", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  closeButton: { alignItems: "center", padding: 15 },
  closeText: { color: "#2D6A4F", fontWeight: "700" },
  confirmBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#17332688", padding: 32 },
  confirmCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "100%", alignItems: "center" },
  confirmIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#FCE8E4", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { color: "#1B2A22", fontSize: 19, fontWeight: "700", marginBottom: 8 },
  confirmBody: { color: "#6E8577", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  dangerButton: { height: 52, borderRadius: 16, backgroundColor: "#D90429", alignItems: "center", justifyContent: "center", width: "100%" },
  dangerText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  confirmCancel: { paddingVertical: 14 },
  confirmCancelText: { color: "#526E5D", fontSize: 15, fontWeight: "600" },
  toast: { position: "absolute", top: 60, alignSelf: "center", backgroundColor: "#1B2A22", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
