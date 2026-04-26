import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function GradientBg({ children, style }: Props) {
  const c = useColors();
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[c.bgGradientStart, c.bgGradientMid, c.bgGradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
