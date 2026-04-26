import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

type Props = {
  lat: number;
  lng: number;
  pointsCount?: number;
};

export function MiniMap({ lat, lng, pointsCount = 0 }: Props) {
  const c = useColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.6 }],
    opacity: 0.5 * (1 - pulse.value),
  }));

  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: c.radius,
          borderColor: c.border,
          backgroundColor: c.card,
        },
      ]}
    >
      <LinearGradient
        colors={[c.accent, c.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: c.radius }]}
      />
      {/* grid lines */}
      <View style={styles.gridRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={[styles.gridLine, { backgroundColor: c.border }]}
          />
        ))}
      </View>
      <View style={[styles.gridCol]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[styles.gridLineV, { backgroundColor: c.border }]}
          />
        ))}
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.pulseDot,
            { backgroundColor: c.destructive },
            dotStyle,
          ]}
        />
        <View style={[styles.dot, { backgroundColor: c.destructive }]}>
          <Feather name="navigation" size={14} color="#fff" />
        </View>
      </View>

      <View style={styles.coords}>
        <Text style={[styles.coordText, { color: c.foreground }]}>
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </Text>
        <Text style={[styles.coordSub, { color: c.mutedForeground }]}>
          {pointsCount} live point{pointsCount === 1 ? "" : "s"} shared
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  gridRow: {
    position: "absolute",
    inset: 0,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  gridLine: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    opacity: 0.5,
  },
  gridCol: {
    position: "absolute",
    inset: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  gridLineV: {
    width: StyleSheet.hairlineWidth,
    height: "100%",
    opacity: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  coords: {
    position: "absolute",
    left: 14,
    bottom: 12,
    right: 14,
  },
  coordText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  coordSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
