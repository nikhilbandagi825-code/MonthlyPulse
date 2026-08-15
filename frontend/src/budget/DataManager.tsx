import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";

import { BackupData, DEFAULT_CATEGORIES, CURRENCIES, expensesToCSV } from "./shared";
import { Palette, useTheme } from "./theme";

const stamp = () => format(new Date(), "yyyy-MM-dd");

const webDownload = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const shareText = async (filename: string, content: string, mime: string) => {
  if (Platform.OS === "web") {
    webDownload(filename, content, mime);
    return true;
  }
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename, UTI: "public.item" });
    return true;
  }
  return false;
};

export default function DataManager({
  backup,
  onImport,
  onToast,
}: {
  backup: BackupData;
  onImport: (data: BackupData) => void;
  onToast: (msg: string) => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [busy, setBusy] = useState(false);

  const exportCSV = async () => {
    if (backup.expenses.length === 0) {
      onToast("No expenses to export yet");
      return;
    }
    setBusy(true);
    try {
      await shareText(`monthlypulse-${stamp()}.csv`, expensesToCSV(backup.expenses), "text/csv");
      onToast("CSV exported");
    } catch {
      onToast("Could not export CSV");
    } finally {
      setBusy(false);
    }
  };

  const exportJSON = async () => {
    setBusy(true);
    try {
      const payload = JSON.stringify({ app: "MonthlyPulse", version: 2, ...backup }, null, 2);
      await shareText(`monthlypulse-backup-${stamp()}.json`, payload, "application/json");
      onToast("Backup file created");
    } catch {
      onToast("Could not create backup");
    } finally {
      setBusy(false);
    }
  };

  const importJSON = async () => {
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) {
        setBusy(false);
        return;
      }
      const uri = res.assets[0].uri;
      let raw: string;
      if (Platform.OS === "web") {
        raw = await (await fetch(uri)).text();
      } else {
        raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      const parsed = JSON.parse(raw);
      const data: BackupData = {
        budget: typeof parsed.budget === "number" ? parsed.budget : 3000,
        limits: parsed.limits && typeof parsed.limits === "object" ? parsed.limits : {},
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        rollover: parsed.rollover === true,
        recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES,
        currency: parsed.currency && parsed.currency.symbol ? parsed.currency : CURRENCIES[0],
        income: Array.isArray(parsed.income) ? parsed.income : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        remainingMode: parsed.remainingMode === "cashflow" ? "cashflow" : "budget",
      };
      onImport(data);
    } catch {
      onToast("That file couldn’t be read");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>DATA & BACKUP</Text>
      <Pressable testID="export-csv-button" disabled={busy} onPress={exportCSV} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: c.surfaceTint }]}>
          <Ionicons name="download-outline" size={19} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Export to CSV</Text>
          <Text style={styles.rowHint}>Share a spreadsheet of every expense</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.placeholder} />
      </Pressable>

      <Pressable testID="export-json-button" disabled={busy} onPress={exportJSON} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: c.surfaceTint }]}>
          <Ionicons name="save-outline" size={19} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Back up my data</Text>
          <Text style={styles.rowHint}>Save a file you can restore on any phone</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.placeholder} />
      </Pressable>

      <Pressable testID="import-json-button" disabled={busy} onPress={importJSON} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: c.warnIconBg }]}>
          <Ionicons name="cloud-upload-outline" size={19} color={c.warnIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Restore from backup</Text>
          <Text style={styles.rowHint}>Replaces current data with a backup file</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.placeholder} />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    label: { color: c.textLabel, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", marginTop: 24, marginBottom: 8 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
    rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    rowHint: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  });
