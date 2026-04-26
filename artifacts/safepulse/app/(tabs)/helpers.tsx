import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
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
  getGetMyAvailabilityQueryKey,
  getListMyInvitationsQueryKey,
  useAcceptInvitation,
  useDeclineInvitation,
  useGetMyAvailability,
  useListMyInvitations,
  useSetResponderAvailability,
  type AvailabilityState,
  type HelperInvitation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { GradientBg } from "@/components/GradientBg";
import { SectionCard } from "@/components/SectionCard";
import { useColors } from "@/hooks/useColors";
import { formatRelative } from "@/lib/format";

export default function HelpersScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const qc = useQueryClient();

  const availabilityQ = useGetMyAvailability({
    query: { queryKey: getGetMyAvailabilityQueryKey() },
  });
  const setAvail = useSetResponderAvailability();
  const invitationsQ = useListMyInvitations({
    query: {
      refetchInterval: 6000,
      queryKey: getListMyInvitationsQueryKey(),
    },
  });

  const acceptMut = useAcceptInvitation();
  const declineMut = useDeclineInvitation();

  const availability: AvailabilityState | undefined = availabilityQ.data;
  const isAvailable = availability?.status === "available";
  const alias = availability?.alias ?? "Helper";

  const toggleAvailable = async () => {
    await setAvail.mutateAsync({
      data: { status: isAvailable ? "unavailable" : "available" },
    });
    qc.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey() });
  };

  const invitations: HelperInvitation[] = invitationsQ.data ?? [];
  const pending = useMemo(
    () => invitations.filter((i) => i.status === "invited"),
    [invitations],
  );
  const past = useMemo(
    () => invitations.filter((i) => i.status !== "invited"),
    [invitations],
  );

  const onAccept = async (id: number) => {
    await acceptMut.mutateAsync({ id, data: { etaMinutes: 7 } });
    qc.invalidateQueries({ queryKey: getListMyInvitationsQueryKey() });
  };
  const onDecline = async (id: number) => {
    await declineMut.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListMyInvitationsQueryKey() });
  };

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 16,
          paddingHorizontal: 20,
          paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 28,
          gap: 16,
        }}
      >
        <View>
          <Text style={[styles.title, { color: c.foreground }]}>
            Be a helper
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Opt in to receive anonymous SOS invitations from people nearby.
            Your real name is never shared — you'll appear as “{alias}”.
          </Text>
        </View>

        <SectionCard>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>
                {isAvailable ? "Available to help" : "Off duty"}
              </Text>
              <Text
                style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}
              >
                {isAvailable
                  ? "We'll invite you when an SOS is raised within roughly 5 km."
                  : "Turn on to start receiving anonymous invitations."}
              </Text>
            </View>
            <Pressable
              onPress={toggleAvailable}
              style={[
                styles.switch,
                {
                  backgroundColor: isAvailable ? c.success : c.border,
                },
              ]}
            >
              <View
                style={[
                  styles.knob,
                  {
                    backgroundColor: "#fff",
                    transform: [{ translateX: isAvailable ? 22 : 2 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={styles.aliasRow}>
            <View
              style={[
                styles.aliasBadge,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
            >
              <Feather name="user" size={12} color={c.primary} />
              <Text
                style={{
                  color: c.secondaryForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 12,
                }}
              >
                {alias}
              </Text>
            </View>
            <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
              Anonymous alias shown to people who need help
            </Text>
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.headerRow}>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>
              Invitations
            </Text>
            {invitationsQ.isLoading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                {pending.length} pending
              </Text>
            )}
          </View>

          {pending.length === 0 && past.length === 0 ? (
            <View style={styles.empty}>
              <View
                style={[styles.emptyIcon, { backgroundColor: c.secondary }]}
              >
                <Feather name="heart" size={22} color={c.primary} />
              </View>
              <Text
                style={{
                  color: c.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                You're all caught up
              </Text>
              <Text
                style={{
                  color: c.mutedForeground,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                When someone nearby triggers an SOS, you'll see an anonymous
                invitation here.
              </Text>
            </View>
          ) : null}

          {pending.map((inv) => (
            <View
              key={inv.id}
              style={[
                styles.invite,
                { backgroundColor: c.muted, borderColor: c.border },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                  <Feather name="alert-triangle" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                    }}
                  >
                    {inv.victimAlias} needs help
                  </Text>
                  <Text
                    style={{
                      color: c.mutedForeground,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {inv.distanceKm != null
                      ? `${inv.distanceKm.toFixed(1)} km away`
                      : "Nearby"}{" "}
                    · {formatRelative(inv.createdAt)} · {inv.riskLevel} risk
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => onDecline(inv.id)}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: c.mutedForeground,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Can't help
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onAccept(inv.id)}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: c.success,
                      borderColor: c.success,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Feather name="check" size={14} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    Accept · ETA 7 min
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          {past.length > 0 ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              <Text
                style={{
                  color: c.mutedForeground,
                  fontSize: 11,
                  fontFamily: "Inter_700Bold",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                Recent
              </Text>
              {past.slice(0, 5).map((inv) => (
                <View key={inv.id} style={styles.pastRow}>
                  <Feather
                    name={
                      inv.status === "accepted"
                        ? "check-circle"
                        : inv.status === "declined"
                          ? "x-circle"
                          : "clock"
                    }
                    size={14}
                    color={
                      inv.status === "accepted"
                        ? c.success
                        : c.mutedForeground
                    }
                  />
                  <Text
                    style={{
                      color: c.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    {inv.victimAlias}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                    {inv.status} · {formatRelative(inv.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>
      </ScrollView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  aliasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  aliasBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  invite: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
});
