import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  channel: string;
  status: string;
  attempts?: number | null;
  priority?: string | null;
  onDark?: boolean;
  compact?: boolean;
};

const ICON_MAP: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  sms: "message-square",
  call: "phone-call",
  whatsapp: "message-circle",
  push: "bell",
  nearby: "users",
  escalation: "alert-triangle",
};

const LABEL_MAP: Record<string, string> = {
  sms: "SMS",
  call: "Call",
  whatsapp: "WhatsApp",
  push: "Push",
  nearby: "Nearby",
  escalation: "Escalation",
};

export function DeliveryChip({
  channel,
  status,
  attempts,
  priority,
  onDark,
  compact,
}: Props) {
  const c = useColors();
  const icon = ICON_MAP[channel] ?? "send";
  const label = LABEL_MAP[channel] ?? channel;
  const failed = status === "failed";
  const queued = status === "pending" || status === "queued";

  const tint = failed
    ? c.destructive
    : queued
      ? c.warning
      : priority === "emergency"
        ? c.destructive
        : c.success;
  const baseBg = onDark ? "rgba(255,255,255,0.06)" : c.muted;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: baseBg,
          borderColor: `${tint}66`,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 4 : 6,
        },
      ]}
    >
      <Feather name={icon} size={compact ? 11 : 13} color={tint} />
      <Text
        style={[
          styles.label,
          { color: onDark ? "#fff" : c.foreground, fontSize: compact ? 10 : 11 },
        ]}
      >
        {label}
      </Text>
      <Text style={[styles.status, { color: tint, fontSize: compact ? 10 : 11 }]}>
        {failed ? "failed" : queued ? "queued" : "delivered"}
      </Text>
      {attempts != null && attempts > 1 ? (
        <Text
          style={[
            styles.attempts,
            { color: onDark ? "rgba(255,255,255,0.6)" : c.mutedForeground },
          ]}
        >
          ×{attempts}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
  },
  status: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  attempts: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
