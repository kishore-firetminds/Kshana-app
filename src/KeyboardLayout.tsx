import React, { forwardRef, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView as NativeScrollView,
  ScrollViewProps,
  View,
  ViewProps,
} from "react-native";

/** Account for headers and safe areas above a keyboard-avoiding region. */
export function KeyboardFrame({ children, style }: ViewProps) {
  const host = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  return (
    <View
      ref={host}
      style={[{ flex: 1, minHeight: 0 }, style]}
      onLayout={() => host.current?.measureInWindow((_x, y) => setOffset(y))}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

export type ScrollView = NativeScrollView;
export const ScrollView = forwardRef<
  NativeScrollView,
  ScrollViewProps & { keyboardAvoidance?: boolean }
>(({ keyboardAvoidance = true, ...props }, ref) => {
  const content = (
    <NativeScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
      {...props}
    />
  );
  return props.horizontal || !keyboardAvoidance ? (
    content
  ) : (
    <KeyboardFrame>{content}</KeyboardFrame>
  );
});
