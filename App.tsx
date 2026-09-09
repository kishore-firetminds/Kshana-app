import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigation } from "./src/navigation";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import { ui } from "./src/figmaTheme";
export default function App() {
  const [loaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });
  if (!loaded && !fontError)
    return (
      <View
        style={{ flex: 1, backgroundColor: ui.bg, justifyContent: "center" }}
      >
        <ActivityIndicator color={ui.primary} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigation />
    </SafeAreaProvider>
  );
}
