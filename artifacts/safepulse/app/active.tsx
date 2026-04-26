import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGetIncidentLocationsQueryKey,
  useGetIncidentLocations,
  useUploadMedia,
  type Incident,
} from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";

import { MiniMap } from "@/components/MiniMap";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { StatusChip } from "@/components/StatusChip";
import { useColors } from "@/hooks/useColors";
import { useSos } from "@/providers/SosProvider";

export default function ActiveScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const {
    activeIncident,
    countdown,
    escalation,
    recordingStatus,
    cancelActive,
    resolveActive,
    discreet,
  } = useSos();

  const incident: Incident | null = activeIncident;
  const incidentId = incident?.id ?? 0;

  const locations = useGetIncidentLocations(incidentId, {
    query: {
      enabled: !!incidentId,
      refetchInterval: 5000,
      queryKey: getGetIncidentLocationsQueryKey(incidentId),
    },
  });
  const uploadMedia = useUploadMedia();

  // If incident no longer active, leave screen
  useEffect(() => {
    if (!incident || incident.status !== "active") {
      router.replace("/(tabs)");
    }
  }, [incident, router]);

  if (!incident) return null;

  const points = locations.data ?? [];
  const latest = points[points.length - 1];
  const lat = latest?.lat ?? incident.startLat;
  const lng = latest?.lng ?? incident.startLng;

  const captureEvidence = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        // fall back to library
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (lib.status !== "granted") return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.6,
        });
        if (result.canceled || !result.assets[0]?.base64) return;
        await uploadMedia.mutateAsync({
          data: {
            incidentId,
            kind: "photo",
            data: result.assets[0].base64,
            mimeType: "image/jpeg",
            durationMs: null,
          },
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      await uploadMedia.mutateAsync({
        data: {
          incidentId,
          kind: "photo",
          data: result.assets[0].base64,
          mimeType: "image/jpeg",
          durationMs: null,
        },
      });
    } catch {
      Alert.alert("Couldn't capture evidence", "Try again in a moment.");
    }
  };

  const recordingLabel =
    recordingStatus === "uploaded"
      ? "Evidence backed up"
      : recordingStatus === "recording"
        ? "Recording & uploading"
        : "Idle";

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#330b1a", "#22102f", "#0d0a23"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 16,
          paddingHorizontal: 20,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 32,
          gap: 16,
        }}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: "rgba(255,77,109,0.15)" },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: "#ff4d6d" }]} />
            <Text style={styles.activeText}>SOS ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.bigTitle}>
          We've got you. Help is on the way.
        </Text>
        <Text style={styles.bigSubtitle}>
          Your circle has been alerted. Stay on this screen — we keep sharing
          your live location and capturing evidence in the background.
        </Text>

        <View style={styles.statusGrid}>
          <BigStatus
            icon="phone-call"
            tone="success"
            label="Alerts sent"
            value={String(incident.alertsSent)}
          />
          <BigStatus
            icon="navigation"
            tone="info"
            label="Live points"
            value={String(points.length)}
          />
          <BigStatus
            icon="film"
            tone="warning"
            label="Evidence"
            value={
              recordingStatus === "uploaded"
                ? "Backed up"
                : recordingStatus === "recording"
                  ? "Recording"
                  : "Standby"
            }
          />
        </View>

        <View style={styles.chipRow}>
          <StatusChip icon="phone" label="SMS · Call · WhatsApp" tone="success" active />
          <StatusChip icon="bell" label="Push delivered" tone="success" active />
          <StatusChip icon="mic" label={recordingLabel} tone="warning" active />
          {discreet ? (
            <StatusChip icon="eye-off" label="Discreet on" tone="info" active />
          ) : null}
          {incident.escalated ? (
            <StatusChip
              icon="users"
              label={`Nearby alerted${escalation ? ` (${escalation.nearbyAlerted})` : ""}`}
              tone="info"
              active
            />
          ) : null}
        </View>

        <SectionCard
          style={{
            backgroundColor: "rgba(26, 22, 64, 0.6)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: "#fff" }]}>
              Live location share
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Inter_500Medium",
                fontSize: 12,
              }}
            >
              Updates every 8s
            </Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <MiniMap lat={lat} lng={lng} pointsCount={points.length} />
          </View>
        </SectionCard>

        {countdown !== null && countdown > 0 && !incident.escalated ? (
          <SectionCard
            style={{
              backgroundColor: "rgba(255, 181, 71, 0.10)",
              borderColor: "rgba(255, 181, 71, 0.35)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,181,71,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#ffb547",
                    fontFamily: "Inter_700Bold",
                    fontSize: 22,
                  }}
                >
                  {countdown}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>
                  Auto-escalation in {countdown}s
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  If no response, we'll alert nearby SafePulse users and ping
                  your circle again.
                </Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        {escalation ? (
          <SectionCard
            style={{
              backgroundColor: "rgba(124, 108, 255, 0.12)",
              borderColor: "rgba(124, 108, 255, 0.35)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "rgba(124,108,255,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="users" size={20} color="#a99dff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>
                  Escalated to nearby users
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {escalation.nearbyAlerted} nearby ·{" "}
                  {escalation.contactsNotified} contacts re-pinged.
                </Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard
          style={{
            backgroundColor: "rgba(26, 22, 64, 0.6)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: "#fff" }]}>
              Evidence
            </Text>
          </View>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Audio is being captured automatically. Add a photo if it's safe to
            do so.
          </Text>
          <Pressable
            onPress={captureEvidence}
            style={({ pressed }) => [
              styles.evidenceBtn,
              {
                borderColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="camera" size={18} color="#fff" />
            <Text
              style={{
                color: "#fff",
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {uploadMedia.isPending ? "Uploading…" : "Capture photo evidence"}
            </Text>
          </Pressable>
        </SectionCard>

        <View style={{ gap: 12, marginTop: 8 }}>
          <PrimaryButton
            label="I'm safe — resolve"
            onPress={() => resolveActive()}
          />
          <PrimaryButton
            label="False alarm — cancel"
            variant="ghost"
            onPress={() => cancelActive()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function BigStatus({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  tone: "success" | "info" | "warning";
}) {
  const tint =
    tone === "success" ? "#3fc594" : tone === "info" ? "#a99dff" : "#ffb547";
  return (
    <View
      style={[
        statusStyles.tile,
        { backgroundColor: "rgba(255,255,255,0.05)" },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={icon} size={13} color={tint} />
        <Text style={[statusStyles.label, { color: "rgba(255,255,255,0.6)" }]}>
          {label}
        </Text>
      </View>
      <Text style={[statusStyles.value, { color: "#fff" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeText: {
    color: "#ff4d6d",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.4,
  },
  bigTitle: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  bigSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: "row",
    gap: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  evidenceBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
