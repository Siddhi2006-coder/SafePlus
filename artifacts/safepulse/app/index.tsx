import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/providers/AuthProvider";
import { storage } from "@/lib/storage";

const ONBOARDING_KEY = "safepulse.onboarded";

export default function IndexScreen() {
  const c = useColors();
  const { ready, token } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await storage.get(ONBOARDING_KEY);
      setOnboarded(v === "true");
      setOnboardingChecked(true);
    })();
  }, []);

  if (!ready || !onboardingChecked) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!token) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
