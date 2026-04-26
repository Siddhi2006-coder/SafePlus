import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  alias: string;
  status: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  onDark?: boolean;
};

export function HelperCard({
  alias,
  status,
  distanceKm,
  etaMinutes,
  onDark,
}: Props) {
  const c = useColors();
  const accepted = status === "accepted";
  const declined = status === "declined" || status === "cancelled";
  const tint = accepted ? c.success : declined ? c.mutedForeground : c.primary;

  const initials = alias
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: onDark ? "rgba(255,255,255,0.05)" : c.card,
          borderColor: onDark ? "rgba(255,255,255,0.08)" : c.border,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: `${tint}22` }]}>
        <Text style={[styles.avatarText, { color: tint }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: onDark ? "#fff" : c.foreground }]}>
          {alias}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: onDark ? "rgba(255,255,255,0.65)" : c.mutedForeground },
          ]}
        >
          {distanceKm != null ? `${distanceKm.toFixed(1)} km away` : "Nearby"}
          {accepted && etaMinutes
            ? ` · ETA ${etaMinutes} min`
            : status === "invited"
              ? " · invited"
              : declined
                ? ` · ${status}`
                : ""}
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          { backgroundColor: `${tint}22`, borderColor: `${tint}66` },
        ]}
      >
        <Feather
          name={
            accepted ? "check" : declined ? "x" : "loader"
          }
          size={11}
          color={tint}
        />
        <Text style={[styles.statusText, { color: tint }]}>
          {accepted ? "On the way" : declined ? "No" : "Pending"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  meta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
