import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigation } from "./src/navigation";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { Audiowide_400Regular } from "@expo-google-fonts/audiowide";
import { ui } from "./src/figmaTheme";
export default function App() {
  const [loaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Audiowide_400Regular,
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
