import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLogout } from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { SectionCard } from "@/components/SectionCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/providers/AuthProvider";
import { useSos } from "@/providers/SosProvider";

export default function SettingsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { voiceEnabled, voiceSupported, setVoiceEnabled, discreet, setDiscreet } =
    useSos();
  const logout = useLogout();

  const handleSignOut = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      /* ignore — still sign out locally */
    }
    await signOut();
    router.replace("/(auth)/login");
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
        <Text style={[styles.title, { color: c.foreground }]}>Settings</Text>

        {user ? (
          <SectionCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <LinearGradient
                colors={[c.primary, c.sosGradientStart]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.foreground }]}>
                  {user.name}
                </Text>
                <Text style={[styles.meta, { color: c.mutedForeground }]}>
                  {user.email}
                </Text>
                <Text style={[styles.meta, { color: c.mutedForeground }]}>
                  {user.phone}
                </Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard>
          <Text style={[styles.section, { color: c.foreground }]}>Safety</Text>

          <SettingRow
            icon="mic"
            title="Voice trigger"
            subtitle={
              voiceSupported
                ? "Listens for ‘Hey SafeSphere, help me’"
                : "Available on supported browsers"
            }
            disabled={!voiceSupported}
            value={voiceEnabled}
            onValueChange={setVoiceEnabled}
          />

          <SettingRow
            icon="eye-off"
            title="Discreet mode"
            subtitle="No haptics on trigger; subtle UI cues"
            value={discreet}
            onValueChange={setDiscreet}
          />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.section, { color: c.foreground }]}>How SOS works</Text>
          <BulletRow
            icon="phone"
            title="Reaches your circle"
            subtitle="Calls, SMS, WhatsApp and push notifications fan out at the same instant."
          />
          <BulletRow
            icon="map-pin"
            title="Live location"
            subtitle="Your real-time location is shared every few seconds while the incident is active."
          />
          <BulletRow
            icon="film"
            title="Evidence capture"
            subtitle="Audio and video clips automatically upload to the cloud as backup."
          />
          <BulletRow
            icon="users"
            title="Smart escalation"
            subtitle="Risk-aware: 4–14 seconds based on motion, repeats and severity. Then nearby helpers and your circle are re-pinged."
          />
        </SectionCard>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOut,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={c.destructive} />
          <Text style={{ color: c.destructive, fontFamily: "Inter_700Bold" }}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </GradientBg>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.muted,
        }}
      >
        <Feather name={icon} size={16} color={c.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: c.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function BulletRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.secondary,
        }}
      >
        <Feather name={icon} size={16} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: c.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            marginTop: 2,
            lineHeight: 17,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  section: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  meta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderWidth: 1,
  },
});
