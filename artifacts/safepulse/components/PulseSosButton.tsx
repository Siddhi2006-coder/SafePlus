import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

type RiskLevel = "low" | "medium" | "high" | "critical";

type Props = {
  active: boolean;
  loading?: boolean;
  onPress: () => void;
  size?: number;
  riskLevel?: RiskLevel | null;
  countdown?: number | null;
};

export function PulseSosButton({
  active,
  loading,
  onPress,
  size = 220,
  riskLevel,
  countdown,
}: Props) {
  const c = useColors();
  const pulse = useSharedValue(0);

  // Speed up pulse based on urgency
  const period = useMemo(() => {
    if (!active) return 1800;
    if (riskLevel === "critical") return 750;
    if (riskLevel === "high") return 1100;
    if (riskLevel === "medium") return 1400;
    return 1700;
  }, [active, riskLevel]);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: period, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, period]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.7 }],
    opacity: 0.5 * (1 - pulse.value),
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ((pulse.value + 0.5) % 1) * 0.7 }],
    opacity: 0.32 * (1 - ((pulse.value + 0.5) % 1)),
  }));

  const gradient: readonly [string, string] = useMemo(() => {
    if (active && riskLevel === "critical")
      return ["#ff2d4f", "#ff4d6d"] as const;
    if (active && riskLevel === "high")
      return ["#ff6b3a", "#ff4d6d"] as const;
    return [c.sosGradientStart, c.sosGradientEnd] as const;
  }, [active, riskLevel, c.sosGradientStart, c.sosGradientEnd]);

  const subtext = active
    ? riskLevel === "critical"
      ? "CRITICAL · holding"
      : riskLevel === "high"
        ? "HIGH · holding"
        : "ACTIVE · holding"
    : loading
      ? "Sending…"
      : "Tap to send";

  return (
    <View style={[styles.wrap, { width: size * 1.7, height: size * 1.7 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: active ? c.destructive : c.primary,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: active ? c.destructive : c.primary,
          },
          ringStyle2,
        ]}
      />
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.btnPressable,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Trigger SOS"
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Feather name="alert-triangle" size={size * 0.22} color="#ffffff" />
          <Text style={[styles.label, { fontSize: size * 0.13 }]}>SOS</Text>
          <Text style={styles.sublabel}>{subtext}</Text>
          {active && typeof countdown === "number" && countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}s · escalation</Text>
          ) : null}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  btnPressable: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff4d6d",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 18,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
    marginTop: 4,
  },
  sublabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  countdown: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    letterSpacing: 1,
  },
});
