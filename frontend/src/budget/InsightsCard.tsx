import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isSameMonth, parseISO, startOfWeek, subDays } from "date-fns";

import { Expense, money } from "./shared";
import { Palette, useTheme } from "./theme";

export default function InsightsCard({
  expenses,
  effectiveBudget,
}: {
  expenses: Expense[];
  effectiveBudget: number;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

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

  // Weekend vs weekday spending pattern (this month).
  const monthEx = expenses.filter((e) => isSameMonth(parseISO(e.date), now));
  let weekendLine: string | null = null;
  if (monthEx.length >= 4) {
    let weTotal = 0;
    let wdTotal = 0;
    const weDays = new Set<string>();
    const wdDays = new Set<string>();
    monthEx.forEach((e) => {
      const d = parseISO(e.date);
      const day = d.getDay();
      const key = e.date.slice(0, 10);
      if (day === 0 || day === 6) {
        weTotal += e.amount;
        weDays.add(key);
      } else {
        wdTotal += e.amount;
        wdDays.add(key);
      }
    });
    const wePer = weDays.size ? weTotal / weDays.size : 0;
    const wdPer = wdDays.size ? wdTotal / wdDays.size : 0;
    if (wePer > 0 && wdPer > 0 && wePer > wdPer * 1.25) {
      weekendLine = `You tend to spend more on weekends — about ${money(wePer)}/day vs ${money(wdPer)}/day midweek.`;
    } else if (wdPer > 0 && wePer > 0 && wdPer > wePer * 1.25) {
      weekendLine = `Your weekdays run heavier — about ${money(wdPer)}/day vs ${money(wePer)}/day on weekends.`;
    }
  }

  return (
    <View testID="insights-card" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles-outline" size={18} color={c.primary} />
        </View>
        <Text style={styles.title}>Your week at a glance</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={15} color={c.accent} style={styles.rowIcon} />
        <Text testID="insight-week" style={styles.line}>{weekLine}</Text>
      </View>
      {top && (
        <View style={styles.row}>
          <Ionicons name="pie-chart-outline" size={15} color={c.accent} style={styles.rowIcon} />
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
            color={paceDiff >= 0 ? c.accent : c.warnIcon}
            style={styles.rowIcon}
          />
          <Text testID="insight-pace" style={styles.line}>{paceLine}</Text>
        </View>
      )}
      {weekendLine && (
        <View style={styles.row}>
          <Ionicons name="cafe-outline" size={15} color={c.accent} style={styles.rowIcon} />
          <Text testID="insight-weekend" style={styles.line}>{weekendLine}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { marginTop: 16, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 18 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    iconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    rowIcon: { marginTop: 2 },
    line: { flex: 1, color: c.textLabel, fontSize: 13, lineHeight: 19 },
  });
