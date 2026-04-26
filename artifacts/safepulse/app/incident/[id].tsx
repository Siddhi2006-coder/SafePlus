import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGetIncidentDetailQueryKey,
  useGetIncidentDetail,
} from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { MiniMap } from "@/components/MiniMap";
import { SectionCard } from "@/components/SectionCard";
import { StatusChip } from "@/components/StatusChip";
import { useColors } from "@/hooks/useColors";
import { formatDateTime, formatRelative, formatTime } from "@/lib/format";

export default function IncidentDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const params = useLocalSearchParams<{ id?: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const detail = useGetIncidentDetail(id, {
    query: {
      enabled: !!id,
      queryKey: getGetIncidentDetailQueryKey(id),
    },
  });

  if (detail.isLoading || !detail.data) {
    return (
      <GradientBg>
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      </GradientBg>
    );
  }

  const { incident, alerts, locations, media } = detail.data;
  const lastPoint = locations[locations.length - 1];

  let statusTone: "success" | "danger" | "neutral" = "neutral";
  if (incident.status === "resolved") statusTone = "success";
  else if (incident.status === "active") statusTone = "danger";

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 12,
          paddingHorizontal: 20,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 32,
          gap: 14,
        }}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: c.card, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Feather name="chevron-left" size={20} color={c.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: c.foreground }]}>
            Incident #{incident.id}
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <StatusChip
            icon={
              incident.status === "resolved"
                ? "check-circle"
                : incident.status === "cancelled"
                  ? "x-circle"
                  : "activity"
            }
            label={incident.status.toUpperCase()}
            tone={statusTone}
            active
          />
          <StatusChip icon="zap" label={incident.trigger} tone="info" active />
          {incident.escalated ? (
            <StatusChip icon="users" label="Escalated" tone="warning" active />
          ) : null}
          {incident.discreet ? (
            <StatusChip icon="eye-off" label="Discreet" tone="info" active />
          ) : null}
        </View>

        <SectionCard>
          <Text style={[styles.section, { color: c.foreground }]}>
            Where it happened
          </Text>
          <View style={{ marginTop: 10 }}>
            <MiniMap
              lat={lastPoint?.lat ?? incident.startLat}
              lng={lastPoint?.lng ?? incident.startLng}
              pointsCount={locations.length}
            />
          </View>
          <View style={{ marginTop: 14, gap: 6 }}>
            <Detail
              label="Started"
              value={formatDateTime(incident.createdAt)}
            />
            {incident.resolvedAt ? (
              <Detail
                label="Closed"
                value={`${formatDateTime(incident.resolvedAt)} · ${formatRelative(
                  incident.resolvedAt,
                )}`}
              />
            ) : null}
            <Detail
              label="Origin"
              value={`${incident.startLat.toFixed(5)}, ${incident.startLng.toFixed(5)}`}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: c.foreground }]}>
              Alerts dispatched
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              {alerts.length} sent
            </Text>
          </View>
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              No alerts on file. Add trusted contacts before triggering.
            </Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {alerts.map((a) => (
                <View key={a.id} style={styles.alertRow}>
                  <View
                    style={[
                      styles.channelIcon,
                      { backgroundColor: c.muted },
                    ]}
                  >
                    <Feather
                      name={iconForChannel(a.channel)}
                      size={14}
                      color={c.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      {labelChannel(a.channel)} · {a.target}
                    </Text>
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {formatTime(a.createdAt)} · {a.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: c.foreground }]}>
              Live location trail
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              {locations.length} points
            </Text>
          </View>
          {locations.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              No location updates recorded.
            </Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {locations.slice(-6).map((p) => (
                <View key={p.id} style={styles.alertRow}>
                  <View
                    style={[
                      styles.channelIcon,
                      { backgroundColor: c.muted },
                    ]}
                  >
                    <Feather name="map-pin" size={14} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </Text>
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {formatTime(p.createdAt)}
                      {p.accuracy != null
                        ? ` · ±${Math.round(p.accuracy)}m`
                        : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: c.foreground }]}>
              Evidence captured
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              {media.length} item{media.length === 1 ? "" : "s"}
            </Text>
          </View>
          {media.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              No media saved for this incident.
            </Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {media.map((m) => (
                <View key={m.id} style={styles.alertRow}>
                  <View
                    style={[
                      styles.channelIcon,
                      { backgroundColor: c.muted },
                    ]}
                  >
                    <Feather
                      name={
                        m.kind === "video"
                          ? "video"
                          : m.kind === "audio"
                            ? "mic"
                            : "image"
                      }
                      size={14}
                      color={c.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      {m.kind} · {humanBytes(m.sizeBytes)}
                    </Text>
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {formatTime(m.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </GradientBg>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          color: c.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: c.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function iconForChannel(
  channel: string,
): React.ComponentProps<typeof Feather>["name"] {
  switch (channel) {
    case "sms":
      return "message-square";
    case "call":
      return "phone-call";
    case "whatsapp":
      return "message-circle";
    case "push":
      return "bell";
    case "nearby":
      return "users";
    case "escalation":
      return "alert-triangle";
    default:
      return "send";
  }
}

function labelChannel(channel: string): string {
  if (channel === "sms") return "SMS";
  if (channel === "call") return "Call";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "push") return "Push";
  if (channel === "nearby") return "Nearby";
  if (channel === "escalation") return "Escalation";
  return channel;
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  section: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: {
    marginTop: 6,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
