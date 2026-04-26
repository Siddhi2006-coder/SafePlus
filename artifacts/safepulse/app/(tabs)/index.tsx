import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetIncidentStats, useListContacts } from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { PulseSosButton } from "@/components/PulseSosButton";
import { SectionCard } from "@/components/SectionCard";
import { StatusChip } from "@/components/StatusChip";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/providers/AuthProvider";
import { useSos } from "@/providers/SosProvider";

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { user } = useAuth();
  const {
    activeIncident,
    triggering,
    voiceEnabled,
    voiceSupported,
    discreet,
    riskLevel,
    countdown,
    trigger,
    setVoiceEnabled,
    setDiscreet,
  } = useSos();

  const stats = useGetIncidentStats();
  const contacts = useListContacts();

  // If active incident exists, push to active screen
  useEffect(() => {
    if (activeIncident && activeIncident.status === "active") {
      router.push("/active");
    }
  }, [activeIncident, router]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "";

  const contactsCount = contacts.data?.length ?? 0;
  const totalIncidents = stats.data?.totalIncidents ?? 0;

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 16,
            paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: c.mutedForeground }]}>
              {greeting},
            </Text>
            <Text style={[styles.name, { color: c.foreground }]}>
              {firstName || "you"}.
            </Text>
          </View>
          {discreet ? (
            <StatusChip
              icon="eye-off"
              label="Discreet"
              tone="info"
              active
            />
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <StatusChip
            icon="users"
            label={`${contactsCount} trusted`}
            tone="info"
            active={contactsCount > 0}
          />
          {voiceSupported ? (
            <StatusChip
              icon="mic"
              label={voiceEnabled ? "Voice listening" : "Voice idle"}
              tone={voiceEnabled ? "success" : "neutral"}
              active={voiceEnabled}
            />
          ) : null}
          <StatusChip
            icon="map-pin"
            label="Location ready"
            tone="success"
            active
          />
        </View>

        <View style={styles.sosWrap}>
          <PulseSosButton
            active={!!activeIncident}
            loading={triggering}
            riskLevel={riskLevel}
            countdown={countdown}
            onPress={() => trigger("button")}
          />
          <Text style={[styles.sosHint, { color: c.mutedForeground }]}>
            One tap sends your live location, alerts your circle, and starts
            evidence capture.
          </Text>
        </View>

        <SectionCard style={{ marginTop: 28 }}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>
              Quick actions
            </Text>
          </View>
          <View style={styles.actionRow}>
            <ActionTile
              icon="mic"
              label={voiceEnabled ? "Voice on" : "Voice trigger"}
              hint={
                voiceSupported
                  ? voiceEnabled
                    ? "Listening for ‘Hey SafeSphere’"
                    : "Hands-free SOS by voice"
                  : "Best on a supported browser"
              }
              active={voiceEnabled && voiceSupported}
              disabled={!voiceSupported}
              onPress={() => voiceSupported && setVoiceEnabled(!voiceEnabled)}
            />
            <ActionTile
              icon="eye-off"
              label={discreet ? "Discreet on" : "Discreet mode"}
              hint={
                discreet
                  ? "No sound, no haptics on trigger"
                  : "Hide alerts on screen"
              }
              active={discreet}
              onPress={() => setDiscreet(!discreet)}
            />
          </View>
        </SectionCard>

        <SectionCard style={{ marginTop: 16 }}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>
              Your safety, in numbers
            </Text>
          </View>
          <View style={styles.statsRow}>
            <StatTile
              label="Total alerts sent"
              value={stats.data?.totalAlerts ?? 0}
              tint={c.primary}
            />
            <StatTile
              label="Incidents handled"
              value={totalIncidents}
              tint={c.success}
            />
            <StatTile
              label="Trusted contacts"
              value={contactsCount}
              tint={c.warning}
            />
          </View>

          <View style={styles.sparkRow}>
            {(stats.data?.last7Days ?? []).map((d, i) => {
              const max = Math.max(
                1,
                ...(stats.data?.last7Days ?? []).map((x) => x.count),
              );
              const h = 8 + (d.count / max) * 60;
              return (
                <View key={d.day} style={styles.sparkCol}>
                  <View
                    style={[
                      styles.sparkBar,
                      {
                        height: h,
                        backgroundColor:
                          d.count > 0 ? c.primary : c.border,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.sparkLabel,
                      { color: c.mutedForeground },
                    ]}
                  >
                    {["S", "M", "T", "W", "T", "F", "S"][
                      new Date(d.day).getDay()
                    ]}
                  </Text>
                </View>
              );
            })}
          </View>
        </SectionCard>

        <Pressable
          onPress={() => router.push("/(tabs)/contacts")}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.ctaIcon,
              { backgroundColor: c.secondary },
            ]}
          >
            <Feather name="user-plus" size={20} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaTitle, { color: c.foreground }]}>
              Add someone to your circle
            </Text>
            <Text style={[styles.ctaSub, { color: c.mutedForeground }]}>
              They'll be the first to hear when you need help.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={c.mutedForeground} />
        </Pressable>
      </ScrollView>
    </GradientBg>
  );
}

function ActionTile({
  icon,
  label,
  hint,
  active,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  hint: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: active ? c.secondary : c.muted,
          borderRadius: c.radius - 6,
          opacity: disabled ? 0.5 : pressed ? 0.94 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.tileIcon,
          { backgroundColor: active ? c.primary : c.card },
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={active ? "#ffffff" : c.foreground}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileLabel, { color: c.foreground }]}>{label}</Text>
        <Text
          style={[styles.tileHint, { color: c.mutedForeground }]}
          numberOfLines={2}
        >
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function StatTile({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.statTile, { backgroundColor: c.muted, borderRadius: 14 }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: { fontFamily: "Inter_500Medium", fontSize: 14 },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginTop: 2,
    letterSpacing: -0.4,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  sosWrap: {
    alignItems: "center",
    marginTop: 18,
  },
  sosHint: {
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  actionRow: {
    gap: 10,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  tileHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statTile: {
    flex: 1,
    padding: 14,
    alignItems: "flex-start",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
  sparkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 18,
    height: 80,
  },
  sparkCol: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  sparkBar: {
    width: 14,
    borderRadius: 6,
  },
  sparkLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  ctaSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
});
