import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Goal, money } from "./shared";
import { Palette, useTheme } from "./theme";
import GoalEditor from "./GoalEditor";

export type GoalWithSaved = Goal & { saved: number };

export default function GoalsPanel({
  goals,
  pool,
  unallocated,
  onSaveGoal,
  onDeleteGoal,
}: {
  goals: GoalWithSaved[];
  pool: number;
  unallocated: number;
  onSaveGoal: (goal: Omit<Goal, "id">, id?: string) => void;
  onDeleteGoal: (id: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setEditorOpen(true);
  };
  const handleSave = (goal: Omit<Goal, "id">, id?: string) => {
    onSaveGoal(goal, id);
    setEditorOpen(false);
    setEditing(null);
  };

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);

  return (
    <View>
      <View style={styles.poolCard}>
        <View style={styles.poolIcon}>
          <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.poolLabel}>SAVED FROM LEFTOVER BUDGET</Text>
        <Text testID="savings-pool" style={styles.poolValue}>{money(pool)}</Text>
        <Text style={styles.poolHint}>
          Each month you stay under budget, the leftover quietly fills your goals below
          {unallocated > 0 ? ` — ${money(unallocated)} waiting for a new goal.` : "."}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your goals</Text>
        <Pressable testID="add-goal-button" onPress={openAdd} style={styles.addButton}>
          <Ionicons name="add" size={16} color={c.primary} />
          <Text style={styles.addText}>New goal</Text>
        </Pressable>
      </View>

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag-outline" size={30} color={c.accentSoft} />
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.muted}>Add a goal like “$500 for a trip” and watch it grow from your monthly leftovers.</Text>
        </View>
      ) : (
        goals.map((g) => {
          const ratio = g.target > 0 ? g.saved / g.target : 0;
          const done = ratio >= 1;
          return (
            <View key={g.id} testID={`goal-${g.id}`} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={[styles.goalIcon, { backgroundColor: `${g.color}22` }]}>
                  <Ionicons name={g.icon} size={20} color={g.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.goalNameRow}>
                    <Text style={styles.goalName}>{g.name}</Text>
                    {done && <Ionicons name="checkmark-circle" size={16} color={c.accent} />}
                  </View>
                  <Text style={styles.muted}>
                    {money(g.saved)} of {money(g.target)}
                    {done ? " · reached 🎉" : ` · ${money(Math.max(g.target - g.saved, 0))} to go`}
                  </Text>
                </View>
                <Text style={[styles.goalPct, done && { color: c.accent }]}>{Math.round(Math.min(ratio, 1) * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: done ? c.accent : g.color }]} />
              </View>
              <View style={styles.goalActions}>
                <Pressable testID={`edit-goal-${g.id}`} onPress={() => openEdit(g)} style={styles.actionButton}>
                  <Ionicons name="create-outline" size={16} color={c.textLabel} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable testID={`delete-goal-${g.id}`} onPress={() => onDeleteGoal(g.id)} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={16} color={c.dangerText} />
                  <Text style={[styles.actionText, { color: c.dangerText }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {goals.length > 0 && (
        <Text style={styles.footNote}>Allocated in order — {money(totalSaved)} across {goals.length} goal{goals.length === 1 ? "" : "s"}.</Text>
      )}

      <GoalEditor
        visible={editorOpen}
        initial={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    poolCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, marginTop: 4 },
    poolIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center", marginBottom: 14 },
    poolLabel: { color: "#A9DDBF", fontSize: 11, letterSpacing: 1.3, fontWeight: "700" },
    poolValue: { color: "#FFFFFF", fontSize: 34, fontWeight: "700", marginTop: 6 },
    poolHint: { color: "#D8F3E3", fontSize: 13, lineHeight: 19, marginTop: 10 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 },
    sectionTitle: { color: c.text, fontSize: 19, fontWeight: "700" },
    addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceTint, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
    addText: { color: c.primary, fontSize: 13, fontWeight: "700" },
    empty: { alignItems: "center", paddingVertical: 34, gap: 8 },
    emptyTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    muted: { color: c.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
    goalCard: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 },
    goalTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    goalIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    goalNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    goalName: { color: c.text, fontSize: 16, fontWeight: "700" },
    goalPct: { color: c.textLabel, fontSize: 15, fontWeight: "700" },
    track: { height: 10, backgroundColor: c.surface2, borderRadius: 5, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 5 },
    goalActions: { flexDirection: "row", gap: 8, marginTop: 14 },
    actionButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    actionText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    footNote: { color: c.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 },
  });
