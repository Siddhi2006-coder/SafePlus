import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
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
import { useLogin } from "@workspace/api-client-react";

import { GradientBg } from "@/components/GradientBg";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    try {
      const result = await login.mutateAsync({
        data: { email: email.trim(), password },
      });
      router.replace({
        pathname: "/(auth)/verify",
        params: {
          challengeId: result.challengeId,
          devOtp: result.devOtp ?? "",
          purpose: "login",
        },
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message.replace(/^HTTP \d+ [^:]*: ?/, "") : "Login failed",
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
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[c.primary, c.sosGradientStart]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandIcon}
          >
            <Feather name="shield" size={22} color="#fff" />
          </LinearGradient>
          <Text style={[styles.brand, { color: c.foreground }]}>SafeSphere</Text>
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>
          Welcome back.
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Sign in to keep your safety circle one tap away.
        </Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
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
            label="Continue"
            onPress={handleSubmit}
            loading={login.isPending}
          />

          <View style={styles.footer}>
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>
              New to SafeSphere?{" "}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  Create account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    minHeight: "100%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
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
    fontSize: 22,
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  form: {
    marginTop: 36,
    gap: 18,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
