import React from "react";
import { Image, StyleSheet, View } from "react-native";

const sources = {
  primary: require("../assets/brand/logo-primary.png"),
  compact: require("../assets/brand/logo-no-tagline.png"),
  white: require("../assets/brand/logo-white.png"),
  monochrome: require("../assets/brand/logo-monochrome.png"),
  icon: require("../assets/brand/icon-only.png"),
};

export function BrandLogo({
  variant = "compact",
  width = 180,
}: {
  variant?: keyof typeof sources;
  width?: number;
}) {
  const source = sources[variant];
  const size = Image.resolveAssetSource(source);
  return (
    <View
      style={{
        width,
        maxWidth: "100%",
        aspectRatio: size.width / size.height,
        flexShrink: 1,
      }}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityLabel="KshanaAPI"
      />
    </View>
  );
}
