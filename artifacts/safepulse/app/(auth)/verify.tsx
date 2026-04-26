import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVerifyOtp } from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/providers/AuthProvider";

export default function VerifyScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { signIn } = useAuth();

  const params = useLocalSearchParams<{
    challengeId?: string;
    devOtp?: string;
    purpose?: string;
  }>();
  const challengeId = params.challengeId ?? "";
  const devOtp = params.devOtp ?? "";

  const [code, setCode] = useState(devOtp);
  const [error, setError] = useState<string | null>(null);

  const verify = useVerifyOtp();

  const handleSubmit = async () => {
    if (!challengeId) {
      setError("Missing verification challenge. Go back and try again.");
      return;
    }
    if (code.length < 4) {
      setError("Enter the 6-digit code we just sent you.");
      return;
    }
    setError(null);
    try {
      const result = await verify.mutateAsync({
        data: { challengeId, code: code.trim() },
      });
      await signIn(result.token, {
        ...result.user,
        createdAt:
          typeof result.user.createdAt === "string"
            ? result.user.createdAt
            : new Date(result.user.createdAt as unknown as string).toISOString(),
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError(
        e instanceof Error ? e.message.replace(/^HTTP \d+ [^:]*: ?/, "") : "Verification failed",
      );
    }
  };

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 20,
            paddingBottom: (isWeb ? 34 : insets.bottom) + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={c.foreground} />
          <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>
            Back
          </Text>
        </Pressable>

        <View style={styles.brandRow}>
          <LinearGradient
            colors={[c.primary, c.sosGradientStart]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandIcon}
          >
            <Feather name="lock" size={22} color="#fff" />
          </LinearGradient>
          <Text style={[styles.brand, { color: c.foreground }]}>Verify</Text>
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>
          Enter the 6-digit code.
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          We sent it to your phone. The code expires in 10 minutes.
        </Text>

        {devOtp ? (
          <View
            style={[
              styles.devBox,
              { backgroundColor: c.secondary, borderRadius: c.radius - 4 },
            ]}
          >
            <Feather name="info" size={14} color={c.primary} />
            <Text
              style={{
                color: c.secondaryForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                flex: 1,
              }}
            >
              Demo mode: your code is{" "}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{devOtp}</Text>.
              In production this is sent by SMS only.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
          />

          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: "rgba(255,77,109,0.12)" },
              ]}
            >
              <Feather name="alert-circle" size={14} color={c.destructive} />
              <Text style={[styles.errorText, { color: c.destructive }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label="Verify and continue"
            onPress={handleSubmit}
            loading={verify.isPending}
          />
        </View>
      </ScrollView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, minHeight: "100%" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  devBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginTop: 20,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
