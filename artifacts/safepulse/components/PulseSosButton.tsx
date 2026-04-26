import React, { useEffect } from "react";
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

type Props = {
  active: boolean;
  loading?: boolean;
  onPress: () => void;
  size?: number;
};

export function PulseSosButton({ active, loading, onPress, size = 220 }: Props) {
  const c = useColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.6 }],
    opacity: 0.45 * (1 - pulse.value),
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ((pulse.value + 0.5) % 1) * 0.6 }],
    opacity: 0.3 * (1 - ((pulse.value + 0.5) % 1)),
  }));

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
          colors={
            active
              ? [c.sosGradientStart, c.sosGradientEnd]
              : [c.sosGradientStart, c.sosGradientEnd]
          }
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
          <Text style={styles.sublabel}>
            {active ? "ACTIVE" : loading ? "Sending…" : "Tap to send"}
          </Text>
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
});
