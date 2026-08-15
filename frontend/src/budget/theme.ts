import { createContext, useContext } from "react";

export type Palette = {
  dark: boolean;
  bg: string;
  bgAlt: string;
  surface: string;
  surface2: string;
  surfaceTint: string;
  border: string;
  borderSelected: string;
  text: string;
  textMuted: string;
  textLabel: string;
  placeholder: string;
  primary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerText: string;
  dangerSoft: string;
  warnBg: string;
  warnBorder: string;
  warnText: string;
  warnIconBg: string;
  warnIcon: string;
  hero: string;
  heroOver: string;
  toastBg: string;
  toastText: string;
  overlay: string;
};

export const LIGHT: Palette = {
  dark: false,
  bg: "#F4F7F4",
  bgAlt: "#F9FCF9",
  surface: "#FFFFFF",
  surface2: "#F0F5F1",
  surfaceTint: "#EAF4EE",
  border: "#D8E6DC",
  borderSelected: "#52B788",
  text: "#1B2A22",
  textMuted: "#6E8577",
  textLabel: "#526E5D",
  placeholder: "#9BAEA1",
  primary: "#2D6A4F",
  accent: "#52B788",
  accentSoft: "#95D5B2",
  danger: "#D90429",
  dangerText: "#D05D46",
  dangerSoft: "#FCE8E4",
  warnBg: "#FFF6EC",
  warnBorder: "#F4D9BC",
  warnText: "#8A5219",
  warnIconBg: "#FFF1DF",
  warnIcon: "#B86B22",
  hero: "#2D6A4F",
  heroOver: "#B5482F",
  toastBg: "#1B2A22",
  toastText: "#FFFFFF",
  overlay: "#17332666",
};

export const DARK: Palette = {
  dark: true,
  bg: "#10160F",
  bgAlt: "#151C13",
  surface: "#1B241A",
  surface2: "#232E20",
  surfaceTint: "#1E2C22",
  border: "#2E3B2E",
  borderSelected: "#52B788",
  text: "#EAF3EC",
  textMuted: "#93A99A",
  textLabel: "#8AA091",
  placeholder: "#6E8577",
  primary: "#6FCF97",
  accent: "#52B788",
  accentSoft: "#3E7D5C",
  danger: "#F26B5E",
  dangerText: "#F08A78",
  dangerSoft: "#3A211D",
  warnBg: "#2A2114",
  warnBorder: "#4A3A22",
  warnText: "#E0B884",
  warnIconBg: "#33280F",
  warnIcon: "#E0A25C",
  hero: "#2D6A4F",
  heroOver: "#8F3A27",
  toastBg: "#EAF3EC",
  toastText: "#12190F",
  overlay: "#000000AA",
};

export const ThemeContext = createContext<{
  c: Palette;
  mode: "light" | "dark";
  toggle: () => void;
  setMode: (m: "light" | "dark") => void;
}>({ c: LIGHT, mode: "light", toggle: () => {}, setMode: () => {} });

export const useTheme = () => useContext(ThemeContext);
