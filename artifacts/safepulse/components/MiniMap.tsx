import React, { useEffect, useMemo } from "react";
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

type Point = { lat: number; lng: number };

type Props = {
  lat: number;
  lng: number;
  pointsCount?: number;
  route?: Point[];
};

const MAP_HEIGHT = 200;

export function MiniMap({ lat, lng, pointsCount = 0, route }: Props) {
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

  // Project route into the map area. We normalize within the bounding box of
  // the trail and add a small inset for breathing room.
  const projected = useMemo(() => {
    if (!route || route.length < 2) return null;
    const lats = route.map((r) => r.lat);
    const lngs = route.map((r) => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = Math.max(0.0002, maxLat - minLat);
    const lngRange = Math.max(0.0002, maxLng - minLng);
    return route.map((p) => ({
      // Normalized 0..1 with 8% inset
      x: 0.08 + 0.84 * ((p.lng - minLng) / lngRange),
      // y inverted so northward shows up
      y: 0.08 + 0.84 * (1 - (p.lat - minLat) / latRange),
    }));
  }, [route]);

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

      {/* Polyline rendered as a series of small rotated segments. */}
      {projected ? (
        <RouteOverlay points={projected} color={c.primary} />
      ) : null}

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
          {projected ? " · route traced" : ""}
        </Text>
      </View>
    </View>
  );
}

function RouteOverlay({
  points,
  color,
}: {
  points: { x: number; y: number }[];
  color: string;
}) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={() => undefined}
    >
      <RouteSegments points={points} color={color} />
    </View>
  );
}

function RouteSegments({
  points,
  color,
}: {
  points: { x: number; y: number }[];
  color: string;
}) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {size.width > 0 &&
        points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const x1 = p.x * size.width;
          const y1 = p.y * size.height;
          const x2 = next.x * size.width;
          const y2 = next.y * size.height;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length < 1) return null;
          const angleRad = Math.atan2(dy, dx);
          const angleDeg = (angleRad * 180) / Math.PI;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: x1,
                top: y1 - 1.5,
                width: length,
                height: 3,
                borderRadius: 2,
                backgroundColor: color,
                opacity: 0.7,
                transform: [
                  { translateX: 0 },
                  { translateY: 0 },
                  { rotateZ: `${angleDeg}deg` },
                ],
                transformOrigin: "0% 50%",
              }}
            />
          );
        })}
      {size.width > 0 &&
        points.map((p, i) => (
          <View
            key={`pt-${i}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p.x * size.width - 3,
              top: p.y * size.height - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              opacity: i === points.length - 1 ? 1 : 0.55,
            }}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MAP_HEIGHT,
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
