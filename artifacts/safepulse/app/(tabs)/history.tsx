import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetIncidentHistory,
  type Incident,
} from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionCard } from "@/components/SectionCard";
import { useColors } from "@/hooks/useColors";
import { formatDateTime, formatRelative } from "@/lib/format";

export default function HistoryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const history = useGetIncidentHistory();
  const data = history.data ?? [];

  return (
    <GradientBg>
      <View
        style={[
          styles.header,
          { paddingTop: (isWeb ? 67 : insets.top) + 16 },
        ]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>Incident history</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          A record of every alert, with timing, location and follow-ups.
        </Text>
      </View>

      {history.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : data.length === 0 ? (
        <View
          style={[
            styles.empty,
            { paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 24 },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: c.secondary },
            ]}
          >
            <Feather name="clock" size={28} color={c.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            No incidents yet
          </Text>
          <Text style={[styles.emptyHint, { color: c.mutedForeground }]}>
            That's a great thing. When you trigger SOS, every alert lands here
            with full timing, locations and outcomes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 28,
            gap: 12,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/incident/${item.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
            >
              <IncidentRow incident={item} />
            </Pressable>
          )}
        />
      )}
    </GradientBg>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const c = useColors();
  const status = incident.status;

  let dotColor = c.primary;
  let label = "Active";
  let icon: React.ComponentProps<typeof Feather>["name"] = "activity";
  if (status === "resolved") {
    dotColor = c.success;
    label = "Resolved";
    icon = "check-circle";
  } else if (status === "cancelled") {
    dotColor = c.mutedForeground;
    label = "Cancelled";
    icon = "x-circle";
  } else {
    dotColor = c.destructive;
  }

  const trigger = labelTrigger(incident.trigger);

  return (
    <SectionCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.iconWrap, { backgroundColor: c.muted }]}>
          <Feather name={icon} size={18} color={dotColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: dotColor },
              ]}
            />
            <Text
              style={{
                color: c.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 15,
              }}
            >
              {label} · {trigger}
            </Text>
          </View>
          <Text
            style={{
              color: c.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {formatDateTime(incident.createdAt)} · {formatRelative(incident.createdAt)}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Stat label="Alerts" value={incident.alertsSent} />
            {incident.escalated ? (
              <Stat label="Escalated" value="Yes" tint={c.warning} />
            ) : null}
            {incident.discreet ? (
              <Stat label="Discreet" value="On" tint={c.primary} />
            ) : null}
            {incident.riskLevel ? (
              <RiskBadge
                level={incident.riskLevel}
                score={incident.riskScore}
                compact
              />
            ) : null}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={c.mutedForeground} />
      </View>
    </SectionCard>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string | number;
  tint?: string;
}) {
  const c = useColors();
  return (
    <View>
      <Text
        style={{
          color: c.mutedForeground,
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: tint ?? c.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 13,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function labelTrigger(t: string): string {
  switch (t) {
    case "voice":
      return "Voice";
    case "lock-screen":
      return "Lock screen";
    case "shake":
      return "Shake";
    default:
      return "Manual";
  }
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 4,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptyHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
