import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CATEGORY_COLORS, Wallet, getCurrencySymbol } from "./shared";
import { Palette, useTheme } from "./theme";

const WALLET_ICONS: Wallet["icon"][] = [
  "cash-outline", "card-outline", "business-outline", "wallet-outline",
  "phone-portrait-outline", "gift-outline", "briefcase-outline", "logo-bitcoin",
];

export default function WalletEditor({
  visible,
  initial,
  existingNames,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Wallet | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (wallet: Omit<Wallet, "id">, id?: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [icon, setIcon] = useState<Wallet["icon"]>(WALLET_ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? "");
      setOpening(initial ? String(initial.opening) : "");
      setIcon(initial?.icon ?? WALLET_ICONS[0]);
      setColor(initial?.color ?? CATEGORY_COLORS[0]);
    }
  }, [visible, initial]);

  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase() && n !== initial?.name);
  const valid = trimmed.length > 0 && !duplicate;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{initial ? "Edit wallet" : "New wallet"}</Text>
              <Pressable testID="close-wallet-editor" onPress={onClose} style={styles.xButton}>
                <Ionicons name="close" size={22} color={c.textLabel} />
              </Pressable>
            </View>

            <View style={[styles.preview, { backgroundColor: `${color}22` }]}>
              <View style={[styles.previewIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.previewName}>{trimmed || "Wallet name"}</Text>
            </View>

            <Text style={styles.label}>NAME</Text>
            <TextInput
              testID="wallet-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cash"
              placeholderTextColor={c.placeholder}
              style={styles.input}
              autoFocus={!initial}
            />
            {duplicate && <Text style={styles.error}>A wallet with this name already exists.</Text>}

            <Text style={styles.label}>OPENING BALANCE</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>{getCurrencySymbol()}</Text>
              <TextInput
                testID="wallet-opening-input"
                value={opening}
                onChangeText={setOpening}
                placeholder="0"
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                style={styles.moneyText}
              />
            </View>

            <Text style={styles.label}>ICON</Text>
            <View style={styles.grid}>
              {WALLET_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  testID={`wallet-icon-${ic}`}
                  onPress={() => setIcon(ic)}
                  style={[styles.iconCell, icon === ic && styles.iconCellSelected]}
                >
                  <Ionicons name={ic} size={22} color={icon === ic ? c.primary : c.textLabel} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>COLOR</Text>
            <View style={styles.grid}>
              {CATEGORY_COLORS.map((cl) => (
                <Pressable
                  key={cl}
                  testID={`wallet-color-${cl}`}
                  onPress={() => setColor(cl)}
                  style={[styles.colorCell, { backgroundColor: cl }, color === cl && styles.colorCellSelected]}
                >
                  {color === cl && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </Pressable>
              ))}
            </View>

            <Pressable
              testID="save-wallet-button"
              onPress={() => valid && onSave({ name: trimmed, opening: Number(opening) || 0, icon, color }, initial?.id)}
              style={[styles.primaryButton, !valid && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryText}>{initial ? "Save changes" : "Add wallet"}</Text>
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
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
    title: { color: c.text, fontSize: 23, fontWeight: "700" },
    xButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    preview: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14, marginBottom: 6 },
    previewIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    previewName: { color: c.text, fontSize: 17, fontWeight: "700" },
    label: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 18, marginBottom: 8 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 15, color: c.text, fontSize: 16 },
    error: { color: c.dangerText, fontSize: 12, marginTop: 6 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 58, paddingHorizontal: 16 },
    currency: { color: c.primary, fontSize: 20, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 26, fontWeight: "700", paddingLeft: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    iconCell: { width: 48, height: 48, borderRadius: 14, borderColor: c.border, borderWidth: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
    iconCellSelected: { borderColor: c.borderSelected, backgroundColor: c.surfaceTint, borderWidth: 2 },
    colorCell: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    colorCellSelected: { borderColor: c.text, borderWidth: 3 },
    primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, marginTop: 26 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
  });
