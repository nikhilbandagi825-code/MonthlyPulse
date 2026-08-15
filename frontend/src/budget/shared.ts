import { Ionicons } from "@expo/vector-icons";

export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  payment: string;
  recurringId?: string;
};
export type Draft = Omit<Expense, "id" | "recurringId">;
export type RecurringRule = {
  id: string;
  amount: number;
  category: string;
  note: string;
  payment: string;
  dayOfMonth: number;
};
export type MonthBar = { key: string; label: string; total: number; isCurrent: boolean };

export const STORAGE_KEY = "serene-budget";
export const PAYMENTS = ["Card", "Cash", "Transfer"];

export type Category = { name: string; icon: keyof typeof Ionicons.glyphMap; color: string };
export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Food", icon: "restaurant-outline", color: "#2D6A4F" },
  { name: "Transport", icon: "car-outline", color: "#52B788" },
  { name: "Home", icon: "home-outline", color: "#95D5B2" },
  { name: "Fun", icon: "game-controller-outline", color: "#F4A261" },
  { name: "Health", icon: "fitness-outline", color: "#6C8EAD" },
  { name: "Other", icon: "wallet-outline", color: "#B7B7A4" },
];
export const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "restaurant-outline", "car-outline", "home-outline", "game-controller-outline",
  "fitness-outline", "cart-outline", "gift-outline", "airplane-outline",
  "school-outline", "paw-outline", "cafe-outline", "medkit-outline",
  "shirt-outline", "book-outline", "phone-portrait-outline", "flash-outline",
  "wallet-outline", "pricetag-outline",
];
export const CATEGORY_COLORS = [
  "#2D6A4F", "#52B788", "#95D5B2", "#F4A261", "#6C8EAD", "#B7B7A4",
  "#D08770", "#B48EAD", "#5E81AC", "#A3BE8C", "#EBCB8B", "#BF616A",
];
export const catMeta = (name: string, categories: Category[]): Category =>
  categories.find((c) => c.name === name) ?? { name, icon: "pricetag-outline", color: "#B7B7A4" };

export type Currency = { code: string; symbol: string; name: string };
export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

let activeSymbol = "$";
export const setCurrencySymbol = (symbol: string) => {
  activeSymbol = symbol;
};
export const getCurrencySymbol = () => activeSymbol;
export const money = (n: number) => `${activeSymbol}${n.toFixed(2)}`;

// Full snapshot of everything we persist — used for backup / restore.
export type BackupData = {
  budget: number;
  limits: Record<string, number>;
  expenses: Expense[];
  rollover: boolean;
  recurring: RecurringRule[];
  categories: Category[];
  currency: Currency;
};

export const expensesToCSV = (expenses: Expense[]): string => {
  const header = "Date,Category,Note,Amount,Payment";
  const rows = expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const date = e.date.slice(0, 10);
      const note = `"${(e.note || "").replace(/"/g, '""')}"`;
      const cat = `"${e.category.replace(/"/g, '""')}"`;
      return `${date},${cat},${note},${e.amount},${e.payment}`;
    });
  return [header, ...rows].join("\n");
};
