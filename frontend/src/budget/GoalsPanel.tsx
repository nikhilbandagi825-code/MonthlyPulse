import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Goal, getCurrencySymbol, money } from "./shared";
import { Palette, useTheme } from "./theme";
import GoalEditor from "./GoalEditor";

export type GoalWithSaved = Goal & { saved: number };

export default function GoalsPanel({
  goals,
  pool,
  unallocated,
  onSaveGoal,
  onDeleteGoal,
  onBoost,
  onClearBoost,
}: {
  goals: GoalWithSaved[];
  pool: number;
  unallocated: number;
  onSaveGoal: (goal: Omit<Goal, "id">, id?: string) => void;
  onDeleteGoal: (id: string) => void;
  onBoost: (id: string, amount: number) => void;
  onClearBoost: (id: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [boostFor, setBoostFor] = useState<string | null>(null);
  const [boostAmount, setBoostAmount] = useState("");

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
  const openBoost = (id: string) => {
    setBoostFor(id);
    setBoostAmount("");
  };
  const confirmBoost = () => {
    const amt = Number(boostAmount) || 0;
    if (boostFor && amt > 0) onBoost(boostFor, amt);
    setBoostFor(null);
    setBoostAmount("");
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
          Each month you stay under budget, the leftover quietly fills your goals — and you can top any goal up by hand
          {unallocated > 0 ? ` (${money(unallocated)} of pool waiting for a new goal).` : "."}
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
          const boost = g.boost || 0;
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
              {boost > 0 && (
                <Text testID={`goal-boost-${g.id}`} style={styles.boostHint}>Includes {money(boost)} you added manually</Text>
              )}
              <View style={styles.goalActions}>
                <Pressable testID={`add-to-goal-${g.id}`} onPress={() => openBoost(g.id)} style={[styles.actionButton, styles.actionPrimary]}>
                  <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                  <Text style={[styles.actionText, { color: c.primary }]}>Add money</Text>
                </Pressable>
                <Pressable testID={`edit-goal-${g.id}`} onPress={() => openEdit(g)} style={styles.actionButton}>
                  <Ionicons name="create-outline" size={16} color={c.textLabel} />
                </Pressable>
                {boost > 0 && (
                  <Pressable testID={`clear-boost-${g.id}`} onPress={() => onClearBoost(g.id)} style={styles.actionButton}>
                    <Ionicons name="refresh-outline" size={16} color={c.textLabel} />
                  </Pressable>
                )}
                <Pressable testID={`delete-goal-${g.id}`} onPress={() => onDeleteGoal(g.id)} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={16} color={c.dangerText} />
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

      <Modal visible={!!boostFor} animationType="fade" transparent>
        <View style={styles.boostBackdrop}>
          <View style={styles.boostCard}>
            <Text style={styles.boostTitle}>Add to this goal</Text>
            <Text style={styles.boostBody}>Top up on your own, on top of the automatic monthly leftover.</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="boost-amount-input"
                value={boostAmount}
                onChangeText={setBoostAmount}
                placeholder="50"
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                autoFocus
                style={styles.moneyText}
              />
            </View>
            <Pressable testID="confirm-boost-button" onPress={confirmBoost} style={styles.boostPrimary}>
              <Text style={styles.boostPrimaryText}>Add money</Text>
            </Pressable>
            <Pressable testID="cancel-boost-button" onPress={() => setBoostFor(null)} style={styles.boostCancel}>
              <Text style={styles.boostCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    boostHint: { color: c.accent, fontSize: 12, fontWeight: "600", marginTop: 8 },
    goalActions: { flexDirection: "row", gap: 8, marginTop: 14 },
    actionButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    actionPrimary: { backgroundColor: c.surfaceTint },
    actionText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    footNote: { color: c.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 },
    boostBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.overlay, padding: 32 },
    boostCard: { backgroundColor: c.surface, borderRadius: 24, padding: 24, width: "100%" },
    boostTitle: { color: c.text, fontSize: 19, fontWeight: "700", marginBottom: 6 },
    boostBody: { color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.bgAlt, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 58, paddingHorizontal: 16 },
    currency: { color: c.primary, fontSize: 20, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 26, fontWeight: "700", paddingLeft: 8 },
    boostPrimary: { height: 52, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
    boostPrimaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
    boostCancel: { paddingVertical: 14, alignItems: "center" },
    boostCancelText: { color: c.textLabel, fontSize: 15, fontWeight: "600" },
  });
