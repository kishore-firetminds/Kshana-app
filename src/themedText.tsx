import React, { forwardRef } from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  TextProps,
  TextInputProps,
} from "react-native";
export type TextInput = NativeTextInput;
export type Text = NativeText;
const families: Record<string, string> = {
  normal: "Inter_400Regular",
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  bold: "Inter_700Bold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_800ExtraBold",
};
function font(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style);
  return {
    fontFamily: families[String(flat?.fontWeight || "400")] || families.normal,
    fontWeight: "normal" as const,
  };
}
// Map weights to bundled static font faces so Android and iOS render identically.
export const Text = forwardRef<NativeText, TextProps>(
  ({ style, ...props }, ref) => (
    <NativeText ref={ref} {...props} style={[style, font(style)]} />
  ),
);
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  ({ style, ...props }, ref) => (
    <NativeTextInput ref={ref} {...props} style={[style, font(style)]} />
  ),
);
export const DisplayText = forwardRef<NativeText, TextProps>(
  ({ style, ...props }, ref) => (
    <NativeText
      ref={ref}
      {...props}
      style={[
        style,
        { fontFamily: "Audiowide_400Regular", fontWeight: "normal" },
      ]}
    />
  ),
);
