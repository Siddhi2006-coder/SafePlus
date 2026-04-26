import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Level = "low" | "medium" | "high" | "critical" | string;

type Props = {
  level: Level;
  score?: number | null;
  compact?: boolean;
  onDark?: boolean;
};

export function RiskBadge({ level, score, compact, onDark }: Props) {
  const c = useColors();
  const lv = (level as string)?.toLowerCase() ?? "medium";
  const map: Record<string, { color: string; label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
    low: { color: c.riskLow, label: "Low risk", icon: "shield" },
    medium: { color: c.riskMedium, label: "Medium risk", icon: "activity" },
    high: { color: c.riskHigh, label: "High risk", icon: "alert-triangle" },
    critical: { color: c.riskCritical, label: "Critical", icon: "zap" },
  };
  const info = map[lv] ?? map.medium;
  const bg = `${info.color}26`;
  const border = `${info.color}55`;
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: onDark ? "rgba(255,255,255,0.08)" : bg,
          borderColor: onDark ? `${info.color}99` : border,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 4 : 6,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: info.color },
        ]}
      />
      <Feather name={info.icon} size={compact ? 11 : 13} color={info.color} />
      <Text
        style={[
          styles.text,
          {
            color: info.color,
            fontSize: compact ? 11 : 12,
          },
        ]}
      >
        {info.label}
        {typeof score === "number" ? ` · ${score}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
