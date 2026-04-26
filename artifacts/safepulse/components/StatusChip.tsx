import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
type IconName = React.ComponentProps<typeof Feather>["name"];

type Props = {
  icon: IconName;
  label: string;
  tone?: Tone;
  active?: boolean;
};

export function StatusChip({ icon, label, tone = "neutral", active }: Props) {
  const c = useColors();
  let bg = c.muted;
  let fg = c.mutedForeground;
  if (active) {
    if (tone === "success") {
      bg = "rgba(63, 197, 148, 0.18)";
      fg = c.success;
    } else if (tone === "warning") {
      bg = "rgba(255, 181, 71, 0.20)";
      fg = c.warning;
    } else if (tone === "danger") {
      bg = "rgba(255, 77, 109, 0.18)";
      fg = c.destructive;
    } else if (tone === "info") {
      bg = "rgba(124, 108, 255, 0.18)";
      fg = c.primary;
    }
  }

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Feather name={icon} size={13} color={fg} />
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
