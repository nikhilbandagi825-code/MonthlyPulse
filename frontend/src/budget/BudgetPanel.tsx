import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Category, Currency, RecurringRule, RemainingMode, Wallet, catMeta, getCurrencySymbol, money, BackupData } from "./shared";
import { Palette, useTheme } from "./theme";
import CategoryEditor from "./CategoryEditor";
import DataManager from "./DataManager";
import WalletEditor from "./WalletEditor";

export default function BudgetPanel({
  budget,
  limits,
  rollover,
  recurring,
  categories,
  currency,
  currencies,
  backup,
  remainingMode,
  themeMode,
  wallets,
  onSave,
  onDeleteRecurring,
  onChangeCurrency,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onImport,
  onToast,
  onChangeRemainingMode,
  onToggleTheme,
  onAddWallet,
  onUpdateWallet,
  onDeleteWallet,
}: {
  budget: number;
  limits: Record<string, number>;
  rollover: boolean;
  recurring: RecurringRule[];
  categories: Category[];
  currency: Currency;
  currencies: Currency[];
  backup: BackupData;
  remainingMode: RemainingMode;
  themeMode: "light" | "dark";
  wallets: Wallet[];
  onSave: (value: number, limits: Record<string, number>, rollover: boolean) => void;
  onDeleteRecurring: (id: string) => void;
  onChangeCurrency: (currency: Currency) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (oldName: string, category: Category) => void;
  onDeleteCategory: (name: string) => void;
  onImport: (data: BackupData) => void;
  onToast: (msg: string) => void;
  onChangeRemainingMode: (mode: RemainingMode) => void;
  onToggleTheme: () => void;
  onAddWallet: (wallet: Omit<Wallet, "id">) => void;
  onUpdateWallet: (id: string, wallet: Omit<Wallet, "id">) => void;
  onDeleteWallet: (id: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [value, setValue] = useState(String(budget));
  const [next, setNext] = useState(limits);
  const [roll, setRoll] = useState(rollover);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [walletEditorOpen, setWalletEditorOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSymbol, setCustomSymbol] = useState("");
  const [customCode, setCustomCode] = useState("");

  const openAddWallet = () => {
    setEditingWallet(null);
    setWalletEditorOpen(true);
  };
  const openEditWallet = (w: Wallet) => {
    setEditingWallet(w);
    setWalletEditorOpen(true);
  };
  const handleWalletSave = (w: Omit<Wallet, "id">, id?: string) => {
    if (id) onUpdateWallet(id, w);
    else onAddWallet(w);
    setWalletEditorOpen(false);
    setEditingWallet(null);
  };

  const isPreset = currencies.some((cy) => cy.code === currency.code && cy.symbol === currency.symbol);

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

      <Text style={styles.inputLabel}>APPEARANCE</Text>
      <View style={styles.toggleRow}>
        <View style={styles.rolloverIcon}>
          <Ionicons name={themeMode === "dark" ? "moon" : "sunny-outline"} size={20} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rolloverTitle}>Dark mode</Text>
          <Text style={styles.rolloverHint}>A calm night theme for low light</Text>
        </View>
        <Switch
          testID="dark-mode-switch"
          value={themeMode === "dark"}
          onValueChange={onToggleTheme}
          trackColor={{ false: c.border, true: c.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={[styles.inputLabel, { marginTop: 24 }]}>“REMAINING” IS BASED ON</Text>
      <View style={styles.segment}>
        <Pressable
          testID="mode-budget"
          onPress={() => onChangeRemainingMode("budget")}
          style={[styles.segmentItem, remainingMode === "budget" && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentText, remainingMode === "budget" && styles.segmentTextActive]}>Monthly budget</Text>
        </Pressable>
        <Pressable
          testID="mode-cashflow"
          onPress={() => onChangeRemainingMode("cashflow")}
          style={[styles.segmentItem, remainingMode === "cashflow" && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentText, remainingMode === "cashflow" && styles.segmentTextActive]}>Income − expenses</Text>
        </Pressable>
      </View>
      <Text style={styles.segmentHint}>
        {remainingMode === "cashflow"
          ? "Cash flow: remaining = the income you log this month minus what you spend."
          : "Budget cap: remaining = your monthly budget minus what you spend."}
      </Text>

      <Text style={[styles.inputLabel, { marginTop: 24 }]}>CURRENCY</Text>
      <View style={styles.currencyChips}>
        {currencies.map((cy) => {
          const selected = isPreset && currency.code === cy.code && currency.symbol === cy.symbol;
          return (
            <Pressable
              key={cy.code}
              testID={`currency-${cy.code}`}
              onPress={() => onChangeCurrency(cy)}
              style={[styles.currencyChip, selected && styles.currencyChipSelected]}
            >
              <Text style={[styles.currencyChipSymbol, selected && styles.currencyChipTextSelected]}>{cy.symbol}</Text>
              <Text style={[styles.currencyChipCode, selected && styles.currencyChipTextSelected]}>{cy.code}</Text>
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
            placeholderTextColor={c.placeholder}
            style={[styles.customInput, { flex: 1 }]}
            maxLength={4}
          />
          <TextInput
            testID="custom-currency-code"
            value={customCode}
            onChangeText={setCustomCode}
            placeholder="Code"
            placeholderTextColor={c.placeholder}
            autoCapitalize="characters"
            style={[styles.customInput, { flex: 1 }]}
            maxLength={5}
          />
          <Pressable testID="apply-custom-currency" onPress={applyCustomCurrency} style={styles.applyButton}>
            <Text style={styles.applyText}>Set</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.categoriesHeader}>
        <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 0 }]}>YOUR WALLETS</Text>
        <Pressable testID="add-wallet-button" onPress={openAddWallet} style={styles.addCategoryButton}>
          <Ionicons name="add" size={16} color={c.primary} />
          <Text style={styles.addCategoryText}>Add</Text>
        </Pressable>
      </View>
      {wallets.map((w) => (
        <View key={w.id} testID={`wallet-row-${w.name}`} style={styles.categoryManageRow}>
          <View style={[styles.categorySwatch, { backgroundColor: `${w.color}22` }]}>
            <Ionicons name={w.icon} size={18} color={w.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryManageName}>{w.name}</Text>
            <Text style={styles.walletOpening}>Opening {money(w.opening)}</Text>
          </View>
          <Pressable testID={`edit-wallet-${w.name}`} onPress={() => openEditWallet(w)} style={styles.categoryAction}>
            <Ionicons name="create-outline" size={18} color={c.textLabel} />
          </Pressable>
          {wallets.length > 1 && (
            <Pressable testID={`delete-wallet-${w.name}`} onPress={() => onDeleteWallet(w.id)} style={styles.categoryAction}>
              <Ionicons name="trash-outline" size={18} color={c.dangerText} />
            </Pressable>
          )}
        </View>
      ))}

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
          <Ionicons name="arrow-redo-outline" size={20} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rolloverTitle}>Budget rollover</Text>
          <Text style={styles.rolloverHint}>Carry last month’s leftover (or overspend) into this month</Text>
        </View>
        <Switch
          testID="rollover-switch"
          value={roll}
          onValueChange={setRoll}
          trackColor={{ false: c.border, true: c.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.categoriesHeader}>
        <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 0 }]}>YOUR CATEGORIES</Text>
        <Pressable testID="add-category-button" onPress={openAddCategory} style={styles.addCategoryButton}>
          <Ionicons name="add" size={16} color={c.primary} />
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
            <Ionicons name="create-outline" size={18} color={c.textLabel} />
          </Pressable>
          {categories.length > 1 && (
            <Pressable
              testID={`delete-category-${cat.name}`}
              onPress={() => handleDeleteCategory(cat.name)}
              style={styles.categoryAction}
            >
              <Ionicons name="trash-outline" size={18} color={c.dangerText} />
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
              placeholderTextColor={c.placeholder}
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
                  <Ionicons name="close" size={18} color={c.dangerText} />
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
        existingNames={categories.map((cat) => cat.name)}
        onClose={() => {
          setEditorOpen(false);
          setEditingCat(null);
        }}
        onSave={handleEditorSave}
      />

      <WalletEditor
        visible={walletEditorOpen}
        initial={editingWallet}
        existingNames={wallets.map((w) => w.name)}
        onClose={() => {
          setWalletEditorOpen(false);
          setEditingWallet(null);
        }}
        onSave={handleWalletSave}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    panelIntro: { color: c.textLabel, fontSize: 15, marginBottom: 20 },
    inputLabel: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 14, marginBottom: 8 },
    optional: { color: c.accentSoft, fontSize: 10 },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 14 },
    segment: { flexDirection: "row", backgroundColor: c.surface2, borderRadius: 14, padding: 4, gap: 4 },
    segmentItem: { flex: 1, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    segmentItemActive: { backgroundColor: c.surface, borderColor: c.borderSelected, borderWidth: 1 },
    segmentText: { color: c.textLabel, fontSize: 13, fontWeight: "600" },
    segmentTextActive: { color: c.primary, fontWeight: "700" },
    segmentHint: { color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
    currencyChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    currencyChip: { minWidth: 60, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderColor: c.border, borderWidth: 1, backgroundColor: c.surface, alignItems: "center" },
    currencyChipSelected: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    currencyChipSymbol: { color: c.text, fontSize: 17, fontWeight: "700" },
    currencyChipCode: { color: c.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
    currencyChipTextSelected: { color: c.primary },
    customCurrencyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    customInput: { height: 48, borderRadius: 12, borderColor: c.border, borderWidth: 1, backgroundColor: c.surface, paddingHorizontal: 12, color: c.text, fontSize: 15 },
    applyButton: { height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    applyText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 14, fontWeight: "700" },
    categoriesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addCategoryButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceTint, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, marginTop: 24 },
    addCategoryText: { color: c.primary, fontSize: 13, fontWeight: "700" },
    categoryManageRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 8 },
    categorySwatch: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    categoryManageName: { flex: 1, color: c.text, fontSize: 15, fontWeight: "600" },
    walletOpening: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    categoryAction: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" },
    limitNameWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    limitDot: { width: 9, height: 9, borderRadius: 5 },
    currencySmall: { color: c.primary, fontSize: 15, fontWeight: "700" },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, height: 60, paddingHorizontal: 17 },
    currency: { color: c.primary, fontSize: 22, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 29, fontWeight: "700", paddingLeft: 8 },
    rolloverRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 18 },
    rolloverIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.surfaceTint, alignItems: "center", justifyContent: "center" },
    rolloverTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    rolloverHint: { color: c.textMuted, fontSize: 12, marginTop: 2, paddingRight: 6 },
    limitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
    limitName: { color: c.text, fontSize: 15, fontWeight: "500" },
    limitInput: { width: 120, height: 44, borderRadius: 12, borderColor: c.border, borderWidth: 1, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 9 },
    limitField: { flex: 1, color: c.text, fontSize: 15, paddingLeft: 4 },
    recurringRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
    recurringIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    recurringName: { color: c.text, fontSize: 14, fontWeight: "600" },
    recurringHint: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    stopButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.dangerSoft, alignItems: "center", justifyContent: "center" },
    recurringNote: { color: c.placeholder, fontSize: 12, marginTop: 2 },
    primaryButton: { height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, marginTop: 24 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
  });
