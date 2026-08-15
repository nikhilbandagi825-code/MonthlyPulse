import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CATEGORY_COLORS, CATEGORY_ICONS, Category } from "./shared";

export default function CategoryEditor({
  visible,
  initial,
  existingNames,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Category | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (category: Category) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<Category["icon"]>(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? "");
      setIcon(initial?.icon ?? CATEGORY_ICONS[0]);
      setColor(initial?.color ?? CATEGORY_COLORS[0]);
    }
  }, [visible, initial]);

  const trimmed = name.trim();
  const duplicate = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase() && n !== initial?.name,
  );
  const valid = trimmed.length > 0 && !duplicate;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{initial ? "Edit category" : "New category"}</Text>
              <Pressable testID="close-category-editor" onPress={onClose} style={styles.xButton}>
                <Ionicons name="close" size={22} color="#526E5D" />
              </Pressable>
            </View>

            <View style={[styles.preview, { backgroundColor: `${color}22` }]}>
              <View style={[styles.previewIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.previewName}>{trimmed || "Category name"}</Text>
            </View>

            <Text style={styles.label}>NAME</Text>
            <TextInput
              testID="category-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Groceries"
              placeholderTextColor="#9BAEA1"
              style={styles.input}
              autoFocus={!initial}
            />
            {duplicate && <Text style={styles.error}>A category with this name already exists.</Text>}

            <Text style={styles.label}>ICON</Text>
            <View style={styles.grid}>
              {CATEGORY_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  testID={`icon-${ic}`}
                  onPress={() => setIcon(ic)}
                  style={[styles.iconCell, icon === ic && styles.iconCellSelected]}
                >
                  <Ionicons name={ic} size={22} color={icon === ic ? "#2D6A4F" : "#526E5D"} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>COLOR</Text>
            <View style={styles.grid}>
              {CATEGORY_COLORS.map((cl) => (
                <Pressable
                  key={cl}
                  testID={`color-${cl}`}
                  onPress={() => setColor(cl)}
                  style={[styles.colorCell, { backgroundColor: cl }, color === cl && styles.colorCellSelected]}
                >
                  {color === cl && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </Pressable>
              ))}
            </View>

            <Pressable
              testID="save-category-button"
              onPress={() => valid && onSave({ name: trimmed, icon, color })}
              style={[styles.primaryButton, !valid && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryText}>{initial ? "Save changes" : "Add category"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#17332666" },
  sheet: { maxHeight: "92%", backgroundColor: "#F9FCF9", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { color: "#1B2A22", fontSize: 23, fontWeight: "700" },
  xButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF4EE", alignItems: "center", justifyContent: "center" },
  preview: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14, marginBottom: 6 },
  previewIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  previewName: { color: "#1B2A22", fontSize: 17, fontWeight: "700" },
  label: { color: "#526E5D", fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 15, color: "#1B2A22", fontSize: 16 },
  error: { color: "#D05D46", fontSize: 12, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconCell: { width: 48, height: 48, borderRadius: 14, borderColor: "#D8E6DC", borderWidth: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  iconCellSelected: { borderColor: "#52B788", backgroundColor: "#EAF4EE", borderWidth: 2 },
  colorCell: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  colorCellSelected: { borderColor: "#1B2A22", borderWidth: 3 },
  primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#2D6A4F", marginTop: 26 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
