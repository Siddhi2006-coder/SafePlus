import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "subtle" | "destructive" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: Props) {
  const c = useColors();
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";
  const isSubtle = variant === "subtle";
  const isGhost = variant === "ghost";

  const gradientColors: readonly [string, string] = isDestructive
    ? [c.destructive, "#ff7a3d"]
    : [c.primary, "#9b8cff"];

  const textColor = isSubtle
    ? c.foreground
    : isGhost
      ? c.mutedForeground
      : "#ffffff";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.wrap,
        {
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {isPrimary || isDestructive ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { borderRadius: c.radius }]}
        >
          <Inner label={label} loading={!!loading} textColor={textColor} />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            {
              borderRadius: c.radius,
              backgroundColor: isSubtle ? c.secondary : "transparent",
              borderWidth: isGhost ? 1 : 0,
              borderColor: c.border,
            },
          ]}
        >
          <Inner label={label} loading={!!loading} textColor={textColor} />
        </View>
      )}
    </Pressable>
  );
}

function Inner({
  label,
  loading,
  textColor,
}: {
  label: string;
  loading: boolean;
  textColor: string;
}) {
  return (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  btn: {
    height: 54,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.4,
  },
});
