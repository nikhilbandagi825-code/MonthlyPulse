import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import { Category, Draft, Expense, PAYMENTS, getCurrencySymbol } from "./shared";
import { Palette, useTheme } from "./theme";

export default function ExpenseModal({
  visible,
  editing,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  editing: Expense | null;
  categories: Category[];
  onClose: () => void;
  onSave: (e: Draft, repeatMonthly: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(editing ? String(editing.amount) : "");
      setCategory(editing ? editing.category : categories[0]?.name ?? "");
      setNote(editing ? editing.note : "");
      setPayment(editing ? editing.payment : PAYMENTS[0]);
      setDate(editing ? parseISO(editing.date) : new Date());
      setShowPicker(false);
      setRepeat(false);
    }
  }, [visible, editing]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "set" && selected) setDate(selected);
  };

  const valid = Number(amount) > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing ? "Edit expense" : "Add expense"}</Text>
                <Text style={styles.muted}>Keep your month in view.</Text>
              </View>
              <Pressable testID="close-expense-modal" onPress={onClose} style={styles.xButton}>
                <Ionicons name="close" size={22} color={c.textLabel} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>AMOUNT</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="expense-amount"
                autoFocus={!editing}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                style={styles.moneyText}
              />
            </View>

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.chips}>
              {categories.map((item) => (
                <Pressable
                  testID={`category-${item.name}`}
                  key={item.name}
                  onPress={() => setCategory(item.name)}
                  style={[styles.chip, category === item.name && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, category === item.name && styles.chipTextSelected]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>DATE</Text>
            <Pressable testID="expense-date-button" onPress={() => setShowPicker((s) => !s)} style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={20} color={c.primary} />
              <Text style={styles.dateText}>{format(date, "EEEE, MMM d, yyyy")}</Text>
              <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={18} color={c.placeholder} />
            </Pressable>
            {showPicker && (
              <View style={Platform.OS === "ios" ? styles.iosPicker : undefined}>
                <DateTimePicker
                  testID="date-time-picker"
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                  accentColor={c.primary}
                />
                {Platform.OS === "ios" && (
                  <Pressable testID="date-done-button" onPress={() => setShowPicker(false)} style={styles.dateDone}>
                    <Text style={styles.dateDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>NOTE</Text>
            <TextInput
              testID="expense-note"
              value={note}
              onChangeText={setNote}
              placeholder="What was it for?"
              placeholderTextColor={c.placeholder}
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
            <View style={styles.chips}>
              {PAYMENTS.map((item) => (
                <Pressable
                  testID={`payment-${item}`}
                  key={item}
                  onPress={() => setPayment(item)}
                  style={[styles.chip, payment === item && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, payment === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            {!editing && (
              <View style={styles.repeatRow}>
                <View style={styles.repeatIcon}>
                  <Ionicons name="repeat-outline" size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repeatTitle}>Repeat monthly</Text>
                  <Text style={styles.repeatHint}>Auto-add on day {date.getDate()} each month</Text>
                </View>
                <Switch
                  testID="repeat-switch"
                  value={repeat}
                  onValueChange={setRepeat}
                  trackColor={{ false: c.border, true: c.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            <Pressable
              testID="save-expense-button"
              onPress={() =>
                valid && onSave({ amount: Number(amount), category, note, payment, date: date.toISOString() }, repeat)
              }
              style={[styles.primaryButton, !valid && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryText}>{editing ? "Save changes" : "Save expense"}</Text>
            </Pressable>

            {editing && (
              <Pressable testID="delete-expense-button" onPress={() => onDelete(editing.id)} style={styles.deleteLink}>
                <Ionicons name="trash-outline" size={18} color={c.danger} />
                <Text style={styles.deleteLinkText}>Delete expense</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: c.overlay },
    sheet: { maxHeight: "92%", backgroundColor: c.bgAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
    sheetTitle: { color: c.text, fontSize: 25, fontWeight: "700", marginBottom: 5 },
    muted: { color: c.textMuted, fontSize: 13 },
    xButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    inputLabel: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 14, marginBottom: 8 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 60, paddingHorizontal: 17 },
    currency: { color: c.primary, fontSize: 22, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 29, fontWeight: "700", paddingLeft: 8 },
    textInput: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, height: 50, paddingHorizontal: 15, color: c.text, fontSize: 15 },
    dateButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 15 },
    dateText: { flex: 1, color: c.text, fontSize: 15, fontWeight: "600" },
    iosPicker: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, marginTop: 10, padding: 8 },
    dateDone: { alignSelf: "flex-end", paddingHorizontal: 18, paddingVertical: 8 },
    dateDoneText: { color: c.primary, fontWeight: "700", fontSize: 15 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 3 },
    chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderColor: c.border, borderWidth: 1, justifyContent: "center", backgroundColor: c.surface },
    chipSelected: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    chipText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    chipTextSelected: { color: c.primary },
    repeatRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 20 },
    repeatIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    repeatTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    repeatHint: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, marginTop: 24 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
    deleteLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 6 },
    deleteLinkText: { color: c.danger, fontSize: 15, fontWeight: "600" },
  });
