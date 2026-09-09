import React, { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import { LinearGradient as GlassGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./themedText";
import { ui } from "./figmaTheme";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const motion = {
  duration: 340,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
};

const icons = {
  Home: ["home-variant-outline", "home-variant"],
  Inbox: ["message-text-outline", "message-text"],
  Campaigns: ["bullhorn-outline", "bullhorn"],
  Alerts: ["bell-outline", "bell"],
  Profile: ["account-circle-outline", "account-circle"],
} as const;

function TabVisual({
  name,
  label,
  selected,
  compact,
}: {
  name: keyof typeof icons;
  label: string;
  selected: boolean;
  compact: boolean;
}) {
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, motion);
  }, [selected, progress]);
  const iconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: progress.value * 5 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + progress.value * 0.25,
    transform: [{ translateY: -progress.value * 1.5 }],
  }));
  return (
    <>
      <Animated.View style={[styles.icon, iconStyle]}>
        <MaterialCommunityIcons
          name={icons[name][0]}
          size={23}
          color={ui.primaryStrong}
        />
      </Animated.View>
      <Animated.View style={labelStyle}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          style={[
            styles.label,
            compact && styles.labelCompact,
            selected && styles.labelSelected,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </>
  );
}

function FloatingGlyph({
  name,
  selected,
}: {
  name: keyof typeof icons;
  selected: boolean;
}) {
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, motion);
  }, [selected, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));
  return (
    <Animated.View style={[styles.glyph, style]}>
      <MaterialCommunityIcons
        name={icons[name][1]}
        size={23}
        color={ui.white}
      />
    </Animated.View>
  );
}

export function BottomNavigation({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(state.index);
  useEffect(() => {
    position.value = withTiming(state.index, motion);
  }, [state.index, position]);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const slotWidth = Math.max(0, width - 12) / state.routes.length;
  const notch = Math.min(32, Math.max(0, slotWidth / 2 - 5));
  const pathProps = useAnimatedProps(() => {
    const center = 6 + slotWidth * (position.value + 0.5);
    return {
      d: `M 17 20 H ${center - notch}
    C ${center - notch * 0.72} 20 ${center - notch * 0.88} 49 ${center} 49
    C ${center + notch * 0.88} 49 ${center + notch * 0.72} 20 ${center + notch} 20
    H ${width - 17} Q ${width - 1} 20 ${width - 1} 36
    V 67 Q ${width - 1} 89 ${width - 23} 89
    H 23 Q 1 89 1 67 V 36 Q 1 20 17 20 Z`,
    };
  });
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 6 + slotWidth * (position.value + 0.5) - 23 }],
  }));
  const focusedRoute = state.routes[state.index];
  if (
    keyboardVisible ||
    getFocusedRouteNameFromRoute(focusedRoute) === "Conversation"
  )
    return null;
  return (
    <View
      style={[
        styles.surround,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: Math.max(insets.left, 14),
          paddingRight: Math.max(insets.right, 14),
        },
      ]}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={styles.dock}
      >
        {width > 0 && (
          <Svg
            pointerEvents="none"
            width={width}
            height={94}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="glass" x1="0" y1="0" x2="0.8" y2="1">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
                <Stop offset="0.5" stopColor="#f1f9f5" stopOpacity="0.88" />
                <Stop offset="1" stopColor="#dceee4" stopOpacity="0.95" />
              </LinearGradient>
              <LinearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor="#b9d6c6" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <AnimatedPath
              animatedProps={pathProps}
              fill={ui.primary}
              opacity={0.06}
              transform="translate(0 4)"
            />
            <AnimatedPath
              animatedProps={pathProps}
              fill="url(#glass)"
              stroke="url(#edge)"
              strokeWidth={1.5}
            />
          </Svg>
        )}
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={
                options.tabBarAccessibilityLabel || `${label} tab`
              }
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <TabVisual
                name={route.name as keyof typeof icons}
                label={label}
                selected={selected}
                compact={slotWidth < 64}
              />
            </Pressable>
          );
        })}
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.iconSelected, bubbleStyle]}
          >
            <GlassGradient
              colors={["#367c59", ui.primary, ui.primaryStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeGlass}
            />
            {state.routes.map((route, index) => (
              <FloatingGlyph
                key={route.key}
                name={route.name as keyof typeof icons}
                selected={state.index === index}
              />
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  surround: { backgroundColor: ui.bg, paddingTop: 4 },
  dock: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    height: 94,
    paddingHorizontal: 6,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 14,
    borderRadius: 22,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  icon: {
    position: "absolute",
    top: 30,
    width: 40,
    height: 33,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSelected: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ui.primary,
    borderWidth: 1.5,
    borderColor: "#d4e8dc",
    shadowColor: ui.primaryStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  activeGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 23 },
  glyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: ui.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    paddingHorizontal: 1,
  },
  labelCompact: { fontSize: 10 },
  labelSelected: { color: ui.primary, fontWeight: "700" },
});
