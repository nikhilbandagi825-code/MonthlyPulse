import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { storage } from "@/src/utils/storage";
import { DARK, LIGHT, ThemeContext } from "@/src/budget/theme";

const THEME_KEY = "mp-theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true)

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const [mode, setModeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<"light" | "dark">(THEME_KEY, "light");
      if (saved === "dark" || saved === "light") setModeState(saved);
    })();
  }, []);

  const setMode = useCallback((m: "light" | "dark") => {
    setModeState(m);
    storage.setItem(THEME_KEY, m);
  }, []);
  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      storage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  const c = mode === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ c, mode, toggle, setMode }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </ThemeContext.Provider>
  );
}
