import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameMonth, parseISO } from "date-fns";

import { Income, Wallet, getCurrencySymbol, money } from "./shared";
import { Palette, useTheme } from "./theme";

const SOURCES = ["Salary", "Freelance", "Gift", "Refund", "Other"];

export default function IncomeModal({
  visible,
  income,
  wallets,
  onAdd,
  onDelete,
  onClose,
}: {
  visible: boolean;
  income: Income[];
  wallets: Wallet[];
  onAdd: (draft: Omit<Income, "id">) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [wallet, setWallet] = useState(wallets[0]?.name ?? "");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setSource(SOURCES[0]);
      setWallet(wallets[0]?.name ?? "");
      setDate(new Date());
      setShowPicker(false);
    }
  }, [visible]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "set" && selected) setDate(selected);
  };

  const valid = Number(amount) > 0;
  const now = new Date();
  const monthIncome = income
    .filter((i) => isSameMonth(parseISO(i.date), now))
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthTotal = monthIncome.reduce((s, i) => s + i.amount, 0);

  const add = () => {
    if (!valid) return;
    onAdd({ amount: Number(amount), source, date: date.toISOString(), wallet });
    setAmount("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Income</Text>
                <Text style={styles.muted}>{money(monthTotal)} in {format(now, "MMMM")}</Text>
              </View>
              <Pressable testID="close-income-modal" onPress={onClose} style={styles.xButton}>
                <Ionicons name="close" size={22} color={c.textLabel} />
              </Pressable>
            </View>

            <Text style={styles.label}>AMOUNT</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="income-amount"
                autoFocus
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                style={styles.moneyText}
              />
            </View>

            <Text style={styles.label}>SOURCE</Text>
            <View style={styles.chips}>
              {SOURCES.map((s) => (
                <Pressable
                  key={s}
                  testID={`income-source-${s}`}
                  onPress={() => setSource(s)}
                  style={[styles.chip, source === s && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, source === s && styles.chipTextSelected]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            {wallets.length > 0 && (
              <>
                <Text style={styles.label}>INTO WALLET</Text>
                <View style={styles.chips}>
                  {wallets.map((w) => (
                    <Pressable
                      key={w.id}
                      testID={`income-wallet-${w.name}`}
                      onPress={() => setWallet(w.name)}
                      style={[styles.chip, wallet === w.name && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, wallet === w.name && styles.chipTextSelected]}>{w.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>DATE</Text>
            <Pressable testID="income-date-button" onPress={() => setShowPicker((s) => !s)} style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={20} color={c.primary} />
              <Text style={styles.dateText}>{format(date, "EEEE, MMM d, yyyy")}</Text>
              <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={18} color={c.placeholder} />
            </Pressable>
            {showPicker && (
              <View style={Platform.OS === "ios" ? styles.iosPicker : undefined}>
                <DateTimePicker
                  testID="income-date-time-picker"
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                  accentColor={c.primary}
                />
                {Platform.OS === "ios" && (
                  <Pressable onPress={() => setShowPicker(false)} style={styles.dateDone}>
                    <Text style={styles.dateDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable testID="add-income-button" onPress={add} style={[styles.primaryButton, !valid && { opacity: 0.5 }]}>
              <Ionicons name="add" size={20} color={c.dark ? "#0E140D" : "#FFFFFF"} />
              <Text style={styles.primaryText}>Add income</Text>
            </Pressable>

            {monthIncome.length > 0 && (
              <>
                <Text style={[styles.label, { marginTop: 24 }]}>THIS MONTH</Text>
                <View style={styles.list}>
                  {monthIncome.map((item, idx, arr) => (
                    <View
                      key={item.id}
                      testID={`income-row-${item.id}`}
                      style={[styles.row, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={styles.rowIcon}>
                        <Ionicons name="arrow-down-outline" size={18} color={c.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{item.source}</Text>
                        <Text style={styles.muted}>{format(parseISO(item.date), "MMM d, yyyy")}</Text>
                      </View>
                      <Text style={styles.rowAmount}>+{money(item.amount)}</Text>
                      <Pressable
                        testID={`delete-income-${item.id}`}
                        onPress={() => onDelete(item.id)}
                        style={styles.deleteButton}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={17} color={c.dangerText} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: c.overlay },
    sheet: { maxHeight: "92%", backgroundColor: c.bgAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
    title: { color: c.text, fontSize: 25, fontWeight: "700", marginBottom: 5 },
    muted: { color: c.textMuted, fontSize: 13 },
    xButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    label: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 14, marginBottom: 8 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 60, paddingHorizontal: 17 },
    currency: { color: c.primary, fontSize: 22, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 29, fontWeight: "700", paddingLeft: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderColor: c.border, borderWidth: 1, justifyContent: "center", backgroundColor: c.surface },
    chipSelected: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    chipText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    chipTextSelected: { color: c.primary },
    dateButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 15 },
    dateText: { flex: 1, color: c.text, fontSize: 15, fontWeight: "600" },
    iosPicker: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, marginTop: 10, padding: 8 },
    dateDone: { alignSelf: "flex-end", paddingHorizontal: 18, paddingVertical: 8 },
    dateDoneText: { color: c.primary, fontWeight: "700", fontSize: 15 },
    primaryButton: { flexDirection: "row", gap: 6, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, marginTop: 24 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
    list: { backgroundColor: c.surface, borderRadius: 18, borderColor: c.border, borderWidth: 1, paddingHorizontal: 14 },
    row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: c.border, borderBottomWidth: 1 },
    rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    rowAmount: { color: c.accent, fontSize: 15, fontWeight: "700" },
    deleteButton: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: c.dangerSoft },
  });
