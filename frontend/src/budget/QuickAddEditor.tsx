import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Category, Preset, getCurrencySymbol } from "./shared";
import { Palette, useTheme } from "./theme";

export default function QuickAddEditor({
  visible,
  categories,
  onClose,
  onSave,
}: {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSave: (preset: Omit<Preset, "id">) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");

  useEffect(() => {
    if (visible) {
      setLabel("");
      setAmount("");
      setCategory(categories[0]?.name ?? "");
    }
  }, [visible, categories]);

  const valid = label.trim().length > 0 && Number(amount) > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>New quick-add</Text>
                <Text style={styles.muted}>One tap to log a common expense.</Text>
              </View>
              <Pressable testID="close-quickadd-editor" onPress={onClose} style={styles.xButton}>
                <Ionicons name="close" size={22} color={c.textLabel} />
              </Pressable>
            </View>

            <Text style={styles.label}>LABEL</Text>
            <TextInput
              testID="quickadd-label-input"
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Coffee"
              placeholderTextColor={c.placeholder}
              style={styles.input}
              autoFocus
            />

            <Text style={styles.label}>AMOUNT</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="quickadd-amount-input"
                value={amount}
                onChangeText={setAmount}
                placeholder="4.00"
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                style={styles.moneyText}
              />
            </View>

            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.chips}>
              {categories.map((item) => (
                <Pressable
                  key={item.name}
                  testID={`quickadd-category-${item.name}`}
                  onPress={() => setCategory(item.name)}
                  style={[styles.chip, category === item.name && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, category === item.name && styles.chipTextSelected]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              testID="save-quickadd-button"
              onPress={() => valid && onSave({ label: label.trim(), amount: Number(amount), category })}
              style={[styles.primaryButton, !valid && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryText}>Save quick-add</Text>
            </Pressable>
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
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
    title: { color: c.text, fontSize: 23, fontWeight: "700", marginBottom: 4 },
    muted: { color: c.textMuted, fontSize: 13 },
    xButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    label: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 16, marginBottom: 8 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 15, color: c.text, fontSize: 16 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 58, paddingHorizontal: 16 },
    currency: { color: c.primary, fontSize: 20, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 26, fontWeight: "700", paddingLeft: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderColor: c.border, borderWidth: 1, justifyContent: "center", backgroundColor: c.surface },
    chipSelected: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    chipText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    chipTextSelected: { color: c.primary },
    primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, marginTop: 26 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
  });
