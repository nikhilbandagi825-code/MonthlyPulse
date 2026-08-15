import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Currency } from "./shared";
import { Palette, useTheme } from "./theme";

export default function Onboarding({
  visible,
  currencies,
  onComplete,
}: {
  visible: boolean;
  currencies: Currency[];
  onComplete: (budget: number, currency: Currency) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<Currency>(currencies[0]);

  const budgetNum = Number(budget) || 0;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          {step === 0 && (
            <View testID="onboard-step-0" style={styles.stepWrap}>
              <View style={styles.hero}>
                <Ionicons name="leaf" size={44} color="#FFFFFF" />
              </View>
              <Text style={styles.eyebrow}>WELCOME TO</Text>
              <Text style={styles.bigTitle}>MonthlyPulse</Text>
              <Text style={styles.subtitle}>
                A calm, private way to track spending, log income and watch your savings grow — all on your device.
              </Text>
              <Pressable testID="onboard-next-0" onPress={() => setStep(1)} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Get started</Text>
                <Ionicons name="arrow-forward" size={18} color={c.dark ? "#0E140D" : "#FFFFFF"} />
              </Pressable>
            </View>
          )}

          {step === 1 && (
            <View testID="onboard-step-1" style={styles.stepWrap}>
              <View style={[styles.hero, styles.heroSoft]}>
                <Ionicons name="wallet-outline" size={40} color={c.primary} />
              </View>
              <Text style={styles.stepTitle}>What’s your monthly budget?</Text>
              <Text style={styles.subtitle}>A realistic number you’d like to stay within each month. You can change it anytime.</Text>
              <View style={styles.moneyInput}>
                <Text style={styles.currency}>{currency.symbol}</Text>
                <TextInput
                  testID="onboard-budget-input"
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="3000"
                  placeholderTextColor={c.placeholder}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={styles.moneyText}
                />
              </View>
              <View style={styles.navRow}>
                <Pressable testID="onboard-back-1" onPress={() => setStep(0)} style={styles.ghostButton}>
                  <Text style={styles.ghostText}>Back</Text>
                </Pressable>
                <Pressable
                  testID="onboard-next-1"
                  onPress={() => budgetNum > 0 && setStep(2)}
                  style={[styles.primaryButton, styles.flex1, budgetNum <= 0 && { opacity: 0.5 }]}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 2 && (
            <View testID="onboard-step-2" style={styles.stepWrap}>
              <View style={[styles.hero, styles.heroSoft]}>
                <Ionicons name="cash-outline" size={40} color={c.primary} />
              </View>
              <Text style={styles.stepTitle}>Pick your currency</Text>
              <Text style={styles.subtitle}>We’ll show every amount in this currency.</Text>
              <View style={styles.chips}>
                {currencies.map((cu) => {
                  const sel = cu.code === currency.code;
                  return (
                    <Pressable
                      key={cu.code}
                      testID={`onboard-currency-${cu.code}`}
                      onPress={() => setCurrency(cu)}
                      style={[styles.chip, sel && styles.chipSelected]}
                    >
                      <Text style={[styles.chipSymbol, sel && styles.chipTextSelected]}>{cu.symbol}</Text>
                      <Text style={[styles.chipCode, sel && styles.chipTextSelected]}>{cu.code}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.navRow}>
                <Pressable testID="onboard-back-2" onPress={() => setStep(1)} style={styles.ghostButton}>
                  <Text style={styles.ghostText}>Back</Text>
                </Pressable>
                <Pressable
                  testID="onboard-finish"
                  onPress={() => onComplete(budgetNum, currency)}
                  style={[styles.primaryButton, styles.flex1]}
                >
                  <Text style={styles.primaryText}>Start tracking</Text>
                  <Ionicons name="checkmark" size={18} color={c.dark ? "#0E140D" : "#FFFFFF"} />
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    container: { flexGrow: 1, padding: 28, paddingTop: 72, justifyContent: "center" },
    dots: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 40 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    dotActive: { width: 26, backgroundColor: c.primary },
    stepWrap: { alignItems: "center" },
    hero: { width: 96, height: 96, borderRadius: 32, backgroundColor: c.hero, alignItems: "center", justifyContent: "center", marginBottom: 28 },
    heroSoft: { backgroundColor: c.surfaceTint },
    eyebrow: { color: c.accent, fontSize: 12, letterSpacing: 2, fontWeight: "700", marginBottom: 6 },
    bigTitle: { color: c.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, marginBottom: 16 },
    stepTitle: { color: c.text, fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 12, letterSpacing: -0.4 },
    subtitle: { color: c.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 30, paddingHorizontal: 6 },
    moneyInput: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 18, height: 68, paddingHorizontal: 20, width: "100%", marginBottom: 28 },
    currency: { color: c.primary, fontSize: 26, fontWeight: "700" },
    moneyText: { flex: 1, color: c.text, fontSize: 34, fontWeight: "700", paddingLeft: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 30 },
    chip: { minWidth: 74, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderColor: c.border, borderWidth: 1, backgroundColor: c.surface, alignItems: "center" },
    chipSelected: { backgroundColor: c.surfaceTint, borderColor: c.borderSelected },
    chipSymbol: { color: c.text, fontSize: 18, fontWeight: "700" },
    chipCode: { color: c.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
    chipTextSelected: { color: c.primary },
    navRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
    flex1: { flex: 1 },
    primaryButton: { flexDirection: "row", gap: 8, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, paddingHorizontal: 24 },
    primaryText: { color: c.dark ? "#0E140D" : "#FFFFFF", fontSize: 16, fontWeight: "700" },
    ghostButton: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: c.surface2 },
    ghostText: { color: c.textLabel, fontSize: 15, fontWeight: "700" },
  });
