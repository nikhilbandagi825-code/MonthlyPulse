import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Category, Currency, RecurringRule, catMeta, getCurrencySymbol, money, BackupData } from "./shared";
import CategoryEditor from "./CategoryEditor";
import DataManager from "./DataManager";

export default function BudgetPanel({
  budget,
  limits,
  rollover,
  recurring,
  categories,
  currency,
  currencies,
  backup,
  onSave,
  onDeleteRecurring,
  onChangeCurrency,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onImport,
  onToast,
}: {
  budget: number;
  limits: Record<string, number>;
  rollover: boolean;
  recurring: RecurringRule[];
  categories: Category[];
  currency: Currency;
  currencies: Currency[];
  backup: BackupData;
  onSave: (value: number, limits: Record<string, number>, rollover: boolean) => void;
  onDeleteRecurring: (id: string) => void;
  onChangeCurrency: (currency: Currency) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (oldName: string, category: Category) => void;
  onDeleteCategory: (name: string) => void;
  onImport: (data: BackupData) => void;
  onToast: (msg: string) => void;
}) {
  const [value, setValue] = useState(String(budget));
  const [next, setNext] = useState(limits);
  const [roll, setRoll] = useState(rollover);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSymbol, setCustomSymbol] = useState("");
  const [customCode, setCustomCode] = useState("");

  const isPreset = currencies.some((c) => c.code === currency.code && c.symbol === currency.symbol);

  const openAddCategory = () => {
    setEditingCat(null);
    setEditorOpen(true);
  };
  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setEditorOpen(true);
  };
  const handleEditorSave = (cat: Category) => {
    if (editingCat) {
      if (editingCat.name !== cat.name) {
        setNext((n) => {
          if (n[editingCat.name] === undefined) return n;
          const { [editingCat.name]: v, ...rest } = n;
          return { ...rest, [cat.name]: v };
        });
      }
      onUpdateCategory(editingCat.name, cat);
    } else {
      onAddCategory(cat);
    }
    setEditorOpen(false);
    setEditingCat(null);
  };
  const handleDeleteCategory = (name: string) => {
    setNext((n) => {
      const { [name]: _removed, ...rest } = n;
      return rest;
    });
    onDeleteCategory(name);
  };
  const applyCustomCurrency = () => {
    const symbol = customSymbol.trim();
    if (!symbol) return;
    const code = customCode.trim().toUpperCase() || symbol;
    onChangeCurrency({ code, symbol, name: "Custom" });
    setCustomOpen(false);
    setCustomSymbol("");
    setCustomCode("");
  };

  return (
    <View>
      <Text style={styles.panelIntro}>Set a monthly plan that feels realistic.</Text>

      <Text style={styles.inputLabel}>CURRENCY</Text>
      <View style={styles.currencyChips}>
        {currencies.map((c) => {
          const selected = isPreset && currency.code === c.code && currency.symbol === c.symbol;
          return (
            <Pressable
              key={c.code}
              testID={`currency-${c.code}`}
              onPress={() => onChangeCurrency(c)}
              style={[styles.currencyChip, selected && styles.currencyChipSelected]}
            >
              <Text style={[styles.currencyChipSymbol, selected && styles.currencyChipTextSelected]}>{c.symbol}</Text>
              <Text style={[styles.currencyChipCode, selected && styles.currencyChipTextSelected]}>{c.code}</Text>
            </Pressable>
          );
        })}
        <Pressable
          testID="currency-custom-toggle"
          onPress={() => setCustomOpen((s) => !s)}
          style={[styles.currencyChip, !isPreset && styles.currencyChipSelected]}
        >
          <Text style={[styles.currencyChipSymbol, !isPreset && styles.currencyChipTextSelected]}>
            {isPreset ? "＋" : currency.symbol}
          </Text>
          <Text style={[styles.currencyChipCode, !isPreset && styles.currencyChipTextSelected]}>
            {isPreset ? "Custom" : currency.code}
          </Text>
        </Pressable>
      </View>
      {customOpen && (
        <View style={styles.customCurrencyRow}>
          <TextInput
            testID="custom-currency-symbol"
            value={customSymbol}
            onChangeText={setCustomSymbol}
            placeholder="Symbol"
            placeholderTextColor="#9BAEA1"
            style={[styles.customInput, { flex: 1 }]}
            maxLength={4}
          />
          <TextInput
            testID="custom-currency-code"
            value={customCode}
            onChangeText={setCustomCode}
            placeholder="Code"
            placeholderTextColor="#9BAEA1"
            autoCapitalize="characters"
            style={[styles.customInput, { flex: 1 }]}
            maxLength={5}
          />
          <Pressable testID="apply-custom-currency" onPress={applyCustomCurrency} style={styles.applyButton}>
            <Text style={styles.applyText}>Set</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.inputLabel, { marginTop: 24 }]}>MONTHLY BUDGET</Text>
      <View style={styles.moneyInput}>
        <Text style={styles.currency}>{getCurrencySymbol()}</Text>
        <TextInput
          testID="budget-input"
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          style={styles.moneyText}
        />
      </View>

      <View style={styles.rolloverRow}>
        <View style={styles.rolloverIcon}>
          <Ionicons name="arrow-redo-outline" size={20} color="#2D6A4F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rolloverTitle}>Budget rollover</Text>
          <Text style={styles.rolloverHint}>Carry last month’s leftover (or overspend) into this month</Text>
        </View>
        <Switch
          testID="rollover-switch"
          value={roll}
          onValueChange={setRoll}
          trackColor={{ false: "#D8E6DC", true: "#52B788" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.categoriesHeader}>
        <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 0 }]}>YOUR CATEGORIES</Text>
        <Pressable testID="add-category-button" onPress={openAddCategory} style={styles.addCategoryButton}>
          <Ionicons name="add" size={16} color="#2D6A4F" />
          <Text style={styles.addCategoryText}>Add</Text>
        </Pressable>
      </View>
      {categories.map((cat) => (
        <View key={cat.name} testID={`category-row-${cat.name}`} style={styles.categoryManageRow}>
          <View style={[styles.categorySwatch, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon} size={18} color={cat.color} />
          </View>
          <Text style={styles.categoryManageName}>{cat.name}</Text>
          <Pressable testID={`edit-category-${cat.name}`} onPress={() => openEditCategory(cat)} style={styles.categoryAction}>
            <Ionicons name="create-outline" size={18} color="#526E5D" />
          </Pressable>
          {categories.length > 1 && (
            <Pressable
              testID={`delete-category-${cat.name}`}
              onPress={() => handleDeleteCategory(cat.name)}
              style={styles.categoryAction}
            >
              <Ionicons name="trash-outline" size={18} color="#D05D46" />
            </Pressable>
          )}
        </View>
      ))}

      <Text style={[styles.inputLabel, { marginTop: 24 }]}>
        CATEGORY LIMITS <Text style={styles.optional}>OPTIONAL</Text>
      </Text>
      {categories.map((cat) => (
        <View key={cat.name} style={styles.limitRow}>
          <View style={styles.limitNameWrap}>
            <View style={[styles.limitDot, { backgroundColor: cat.color }]} />
            <Text style={styles.limitName}>{cat.name}</Text>
          </View>
          <View style={styles.limitInput}>
            <Text style={styles.currencySmall}>{getCurrencySymbol()}</Text>
            <TextInput
              testID={`limit-${cat.name}`}
              placeholder="No limit"
              placeholderTextColor="#9BAEA1"
              value={next[cat.name] ? String(next[cat.name]) : ""}
              onChangeText={(v) => setNext({ ...next, [cat.name]: Number(v) || 0 })}
              keyboardType="decimal-pad"
              style={styles.limitField}
            />
          </View>
        </View>
      ))}

      {recurring.length > 0 && (
        <>
          <Text style={[styles.inputLabel, { marginTop: 24 }]}>RECURRING EXPENSES</Text>
          {recurring.map((rule) => {
            const meta = catMeta(rule.category, categories);
            return (
            <View key={rule.id} testID={`recurring-${rule.id}`} style={styles.recurringRow}>
              <View style={[styles.recurringIcon, { backgroundColor: `${meta.color}22` }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recurringName}>{rule.note || rule.category}</Text>
                <Text style={styles.recurringHint}>
                  {money(rule.amount)} · day {rule.dayOfMonth} each month
                </Text>
              </View>
              <Pressable
                testID={`stop-recurring-${rule.id}`}
                onPress={() => onDeleteRecurring(rule.id)}
                style={styles.stopButton}
              >
                <Ionicons name="close" size={18} color="#D05D46" />
              </Pressable>
            </View>
            );
          })}
          <Text style={styles.recurringNote}>Stopping a recurring expense keeps past entries.</Text>
        </>
      )}

      <DataManager backup={backup} onImport={onImport} onToast={onToast} />

      <Pressable
        testID="save-budget-button"
        onPress={() => onSave(Number(value) || 0, next, roll)}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>Save budget</Text>
      </Pressable>

      <CategoryEditor
        visible={editorOpen}
        initial={editingCat}
        existingNames={categories.map((c) => c.name)}
        onClose={() => {
          setEditorOpen(false);
          setEditingCat(null);
        }}
        onSave={handleEditorSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panelIntro: { color: "#526E5D", fontSize: 15, marginBottom: 20 },
  inputLabel: { color: "#526E5D", fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 14, marginBottom: 8 },
  optional: { color: "#95D5B2", fontSize: 10 },
  currencyChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  currencyChip: { minWidth: 60, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderColor: "#D8E6DC", borderWidth: 1, backgroundColor: "#FFFFFF", alignItems: "center" },
  currencyChipSelected: { backgroundColor: "#EAF4EE", borderColor: "#52B788" },
  currencyChipSymbol: { color: "#1B2A22", fontSize: 17, fontWeight: "700" },
  currencyChipCode: { color: "#6E8577", fontSize: 11, fontWeight: "600", marginTop: 2 },
  currencyChipTextSelected: { color: "#2D6A4F" },
  customCurrencyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  customInput: { height: 48, borderRadius: 12, borderColor: "#D8E6DC", borderWidth: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#1B2A22", fontSize: 15 },
  applyButton: { height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#2D6A4F", alignItems: "center", justifyContent: "center" },
  applyText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  categoriesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addCategoryButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EAF4EE", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, marginTop: 24 },
  addCategoryText: { color: "#2D6A4F", fontSize: 13, fontWeight: "700" },
  categoryManageRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 8 },
  categorySwatch: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryManageName: { flex: 1, color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  categoryAction: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F0F5F1", alignItems: "center", justifyContent: "center" },
  limitNameWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  limitDot: { width: 9, height: 9, borderRadius: 5 },
  currencySmall: { color: "#2D6A4F", fontSize: 15, fontWeight: "700" },
  moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 16, height: 60, paddingHorizontal: 17 },
  currency: { color: "#2D6A4F", fontSize: 22, fontWeight: "700" },
  moneyText: { flex: 1, color: "#1B2A22", fontSize: 29, fontWeight: "700", paddingLeft: 8 },
  rolloverRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 18 },
  rolloverIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#EAF4EE", alignItems: "center", justifyContent: "center" },
  rolloverTitle: { color: "#1B2A22", fontSize: 15, fontWeight: "600" },
  rolloverHint: { color: "#6E8577", fontSize: 12, marginTop: 2, paddingRight: 6 },
  limitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  limitName: { color: "#1B2A22", fontSize: 15, fontWeight: "500" },
  limitInput: { width: 120, height: 44, borderRadius: 12, borderColor: "#D8E6DC", borderWidth: 1, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 9 },
  limitField: { flex: 1, color: "#1B2A22", fontSize: 15, paddingLeft: 4 },
  recurringRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderColor: "#D8E6DC", borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  recurringIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recurringName: { color: "#1B2A22", fontSize: 14, fontWeight: "600" },
  recurringHint: { color: "#6E8577", fontSize: 12, marginTop: 2 },
  stopButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FCE8E4", alignItems: "center", justifyContent: "center" },
  recurringNote: { color: "#9BAEA1", fontSize: 12, marginTop: 2 },
  primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#2D6A4F", marginTop: 24 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
