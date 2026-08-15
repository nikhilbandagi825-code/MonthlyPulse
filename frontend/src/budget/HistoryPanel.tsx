import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";

import { Category, Expense, MonthBar, catMeta, getCurrencySymbol, money } from "./shared";

type DateRange = "all" | "month" | "3m" | "year";
const RANGE_LABELS: { key: DateRange; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "month", label: "This month" },
  { key: "3m", label: "Last 3 mo" },
  { key: "year", label: "This year" },
];

export default function HistoryPanel({
  history,
  expenses,
  categories,
  onEdit,
  onDelete,
}: {
  history: MonthBar[];
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const max = Math.max(...history.map((h) => h.total), 1);
  const active = history.filter((h) => h.total > 0);
  const avg = active.length ? active.reduce((s, h) => s + h.total, 0) / active.length : 0;
  const highest = history.reduce((a, b) => (b.total > a.total ? b : a), history[0]);

  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [range, setRange] = useState<DateRange>("all");

  const nowRef = new Date();
  const inRange = (d: Date) => {
    if (range === "month") return isSameMonth(d, nowRef);
    if (range === "3m") return d >= subMonths(startOfMonth(nowRef), 2);
    if (range === "year") return d.getFullYear() === nowRef.getFullYear();
    return true;
  };

  const minVal = Number(minAmt) || 0;
  const maxVal = Number(maxAmt) || 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (filterCat && e.category !== filterCat) return false;
        if (minVal > 0 && e.amount < minVal) return false;
        if (maxVal > 0 && e.amount > maxVal) return false;
        if (!inRange(parseISO(e.date))) return false;
        if (!q) return true;
        return e.note.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, query, filterCat, minVal, maxVal, range]);

  const advancedActive = minVal > 0 || maxVal > 0 || range !== "all";
  const searching = query.trim().length > 0 || filterCat !== null || advancedActive;

  const clearAll = () => {
    setQuery("");
    setFilterCat(null);
    setMinAmt("");
    setMaxAmt("");
    setRange("all");
  };

  return (
    <View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#6E8577" />
        <TextInput
          testID="search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by note or category"
          placeholderTextColor="#9BAEA1"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable testID="clear-search" onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color="#9BAEA1" />
          </Pressable>
        )}
      </View>
      <View style={styles.chips}>
        <Pressable
          testID="filter-All"
          onPress={() => setFilterCat(null)}
          style={[styles.chip, filterCat === null && styles.chipSelected]}
        >
          <Text style={[styles.chipText, filterCat === null && styles.chipTextSelected]}>All</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            testID={`filter-${c.name}`}
            key={c.name}
            onPress={() => setFilterCat(filterCat === c.name ? null : c.name)}
            style={[styles.chip, filterCat === c.name && styles.chipSelected]}
          >
            <Text style={[styles.chipText, filterCat === c.name && styles.chipTextSelected]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterToggleRow}>
        <Pressable testID="toggle-filters" onPress={() => setShowFilters((s) => !s)} style={styles.filterToggle}>
          <Ionicons name="options-outline" size={16} color="#2D6A4F" />
          <Text style={styles.filterToggleText}>Amount & date</Text>
          {advancedActive && <View style={styles.filterDot} />}
          <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={15} color="#6E8577" />
        </Pressable>
        {searching && (
          <Pressable testID="clear-filters" onPress={clearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View testID="advanced-filters" style={styles.filterPanel}>
          <Text style={styles.filterLabel}>AMOUNT RANGE</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountInput}>
              <Text style={styles.currencySmall}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="min-amount"
                value={minAmt}
                onChangeText={setMinAmt}
                placeholder="Min"
                placeholderTextColor="#9BAEA1"
                keyboardType="decimal-pad"
                style={styles.amountField}
              />
            </View>
            <Text style={styles.amountDash}>–</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySmall}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="max-amount"
                value={maxAmt}
                onChangeText={setMaxAmt}
                placeholder="Max"
                placeholderTextColor="#9BAEA1"
                keyboardType="decimal-pad"
                style={styles.amountField}
              />
            </View>
          </View>
          <Text style={[styles.filterLabel, { marginTop: 14 }]}>DATE RANGE</Text>
          <View style={styles.chips}>
            {RANGE_LABELS.map((r) => (
              <Pressable
                testID={`range-${r.key}`}
                key={r.key}
                onPress={() => setRange(r.key)}
                style={[styles.chip, range === r.key && styles.chipSelected]}
              >
                <Text style={[styles.chipText, range === r.key && styles.chipTextSelected]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {searching ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Results</Text>
            <Text style={styles.month}>{results.length} found</Text>
          </View>
          <View style={styles.expenseCard}>
            {results.length ? (
              results.map((item, idx, arr) => {
                const meta = catMeta(item.category, categories);
                return (
                <Pressable
                  testID={`result-${item.id}`}
                  key={item.id}
                  onPress={() => onEdit(item)}
                  onLongPress={() => onDelete(item.id)}
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
                      {item.category} · {format(parseISO(item.date), "MMM d, yyyy")} · {item.payment}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>-{money(item.amount)}</Text>
                </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyResults}>
                <Ionicons name="search-outline" size={26} color="#95D5B2" />
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.muted}>Try a different word or category.</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.trendStatsRow}>
            <View style={styles.trendStat}>
              <Text style={styles.cardLabelDark}>MONTHLY AVERAGE</Text>
              <Text testID="trend-average" style={styles.trendStatValue}>{money(avg)}</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.cardLabelDark}>HIGHEST MONTH</Text>
              <Text testID="trend-highest" style={styles.trendStatValue}>{highest.total > 0 ? highest.label : "—"}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last 6 months</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.trendBars}>
              {history.map((h) => (
                <View key={h.key} testID={`trend-${h.key}`} style={styles.trendBarItem}>
                  <Text style={styles.trendAmount}>{h.total > 0 ? `${getCurrencySymbol()}${Math.round(h.total)}` : ""}</Text>
                  <View style={styles.trendTrack}>
                    <View
                      style={[
                        styles.trendFill,
                        {
                          height: `${Math.max((h.total / max) * 100, h.total > 0 ? 6 : 0)}%`,
                          backgroundColor: h.isCurrent ? "#2D6A4F" : "#95D5B2",
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.trendLabel, h.isCurrent && styles.trendLabelActive]}>{h.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {active.length === 0 && (
            <View style={styles.historyEmpty}>
              <Ionicons name="trending-up-outline" size={28} color="#95D5B2" />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.muted}>Your monthly trends appear as you track spending.</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 16, height: 52, paddingHorizontal: 15, marginBottom: 12 },
  searchInput: { flex: 1, color: "#1B2A22", fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderColor: "#D8E6DC", borderWidth: 1, justifyContent: "center", backgroundColor: "#FFFFFF" },
  chipSelected: { backgroundColor: "#EAF4EE", borderColor: "#52B788" },
  chipText: { color: "#526E5D", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#2D6A4F" },
  filterToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  filterToggleText: { color: "#2D6A4F", fontSize: 13, fontWeight: "700" },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F4A261" },
  clearButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#F0F5F1" },
  clearButtonText: { color: "#526E5D", fontSize: 12, fontWeight: "700" },
  filterPanel: { backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 8 },
  filterLabel: { color: "#526E5D", fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginBottom: 8 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amountInput: { flex: 1, height: 46, borderRadius: 12, borderColor: "#D8E6DC", borderWidth: 1, backgroundColor: "#F9FCF9", flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  currencySmall: { color: "#2D6A4F", fontSize: 15, fontWeight: "700" },
  amountField: { flex: 1, color: "#1B2A22", fontSize: 15, paddingLeft: 4 },
  amountDash: { color: "#9BAEA1", fontSize: 16, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: "#1B2A22", fontSize: 19, fontWeight: "700" },
  month: { color: "#6E8577", fontSize: 12 },
  expenseCard: { backgroundColor: "#FFFFFF", borderRadius: 20, borderColor: "#D8E6DC", borderWidth: 1, paddingHorizontal: 16 },
  expenseRow: { minHeight: 72, flexDirection: "row", alignItems: "center", borderBottomColor: "#EDF3EE", borderBottomWidth: 1, gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  expenseName: { color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  expenseAmount: { color: "#D05D46", fontSize: 15, fontWeight: "700" },
  emptyResults: { alignItems: "center", paddingVertical: 26, gap: 7 },
  emptyTitle: { color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  muted: { color: "#6E8577", fontSize: 13 },
  cardLabelDark: { color: "#526E5D", fontSize: 11, letterSpacing: 1.2, fontWeight: "700" },
  trendStatsRow: { flexDirection: "row", gap: 14, marginTop: 16 },
  trendStat: { flex: 1, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 18, padding: 16 },
  trendStatValue: { color: "#1B2A22", fontSize: 22, fontWeight: "700", marginTop: 6 },
  chartCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderColor: "#D8E6DC", borderWidth: 1 },
  trendBars: { height: 180, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end" },
  trendBarItem: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  trendAmount: { color: "#526E5D", fontSize: 10, fontWeight: "600", marginBottom: 6 },
  trendTrack: { height: 120, width: 26, backgroundColor: "#F0F5F1", borderRadius: 13, justifyContent: "flex-end", overflow: "hidden" },
  trendFill: { width: "100%", borderRadius: 13 },
  trendLabel: { color: "#9BAEA1", fontSize: 11, marginTop: 8, fontWeight: "600" },
  trendLabelActive: { color: "#2D6A4F" },
  historyEmpty: { alignItems: "center", paddingVertical: 30, gap: 8 },
});
