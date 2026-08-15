import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isSameMonth, parseISO, startOfWeek, subDays } from "date-fns";

import { Expense, money } from "./shared";

export default function InsightsCard({
  expenses,
  effectiveBudget,
}: {
  expenses: Expense[];
  effectiveBudget: number;
}) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subDays(weekStart, 7);

  const thisWeek = expenses.filter((e) => {
    const d = parseISO(e.date);
    return d >= weekStart && d <= now;
  });
  const lastWeek = expenses.filter((e) => {
    const d = parseISO(e.date);
    return d >= lastWeekStart && d < weekStart;
  });

  const thisTotal = thisWeek.reduce((s, e) => s + e.amount, 0);
  const lastTotal = lastWeek.reduce((s, e) => s + e.amount, 0);

  const byCat: Record<string, number> = {};
  thisWeek.forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const monthSpent = expenses
    .filter((e) => isSameMonth(parseISO(e.date), now))
    .reduce((s, e) => s + e.amount, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expected = effectiveBudget * (now.getDate() / daysInMonth);
  const paceDiff = expected - monthSpent;

  let weekLine: string;
  if (lastTotal > 0 && thisTotal > 0) {
    const change = ((thisTotal - lastTotal) / lastTotal) * 100;
    weekLine =
      Math.abs(change) < 5
        ? `You’ve spent ${money(thisTotal)} this week — about the same as last week.`
        : change < 0
          ? `You’ve spent ${money(thisTotal)} this week, down ${Math.abs(Math.round(change))}% from last week. Nice.`
          : `You’ve spent ${money(thisTotal)} this week, up ${Math.round(change)}% from last week.`;
  } else if (thisTotal > 0) {
    weekLine = `You’ve spent ${money(thisTotal)} so far this week.`;
  } else {
    weekLine = "No spending yet this week — a calm start.";
  }

  const paceLine =
    effectiveBudget <= 0
      ? null
      : paceDiff >= 0
        ? `You’re pacing well — about ${money(paceDiff)} under plan for this point in the month.`
        : `You’re about ${money(Math.abs(paceDiff))} ahead of plan — a lighter week could help.`;

  return (
    <View testID="insights-card" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles-outline" size={18} color="#2D6A4F" />
        </View>
        <Text style={styles.title}>Your week at a glance</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={15} color="#52B788" style={styles.rowIcon} />
        <Text testID="insight-week" style={styles.line}>{weekLine}</Text>
      </View>
      {top && (
        <View style={styles.row}>
          <Ionicons name="pie-chart-outline" size={15} color="#52B788" style={styles.rowIcon} />
          <Text testID="insight-top" style={styles.line}>
            Most of it went to {top[0]} ({money(top[1])}).
          </Text>
        </View>
      )}
      {paceLine && (
        <View style={styles.row}>
          <Ionicons
            name={paceDiff >= 0 ? "leaf-outline" : "speedometer-outline"}
            size={15}
            color={paceDiff >= 0 ? "#52B788" : "#F4A261"}
            style={styles.rowIcon}
          />
          <Text testID="insight-pace" style={styles.line}>{paceLine}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 20, padding: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#EAF4EE", alignItems: "center", justifyContent: "center" },
  title: { color: "#1B2A22", fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  rowIcon: { marginTop: 2 },
  line: { flex: 1, color: "#526E5D", fontSize: 13, lineHeight: 19 },
});
