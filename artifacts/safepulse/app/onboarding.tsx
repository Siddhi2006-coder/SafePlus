import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { GradientBg } from "@/components/GradientBg";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { storage } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ONBOARDING_KEY = "safepulse.onboarded";

type Slide = {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  hint: string;
};

const SLIDES: Slide[] = [
  {
    icon: "shield",
    title: "One tap.\nA whole circle responds.",
    body:
      "SafeSphere fans out an SOS over SMS, calls, WhatsApp, and push — all at the same instant.",
    hint: "Built for the moments when seconds matter.",
  },
  {
    icon: "activity",
    title: "AI that reads the situation.",
    body:
      "Risk score watches your motion, your trigger style, and how often you've called for help — and escalates faster when it should.",
    hint: "Auto-escalate in 4–14 seconds based on real-time risk.",
  },
  {
    icon: "users",
    title: "Strangers, but not really.",
    body:
      "When risk goes critical, nearby SafeSphere helpers receive an anonymous invitation to step in — with an ETA and an alias, never your real name.",
    hint: "Encrypted location and evidence. End to end.",
  },
];

export default function OnboardingScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    },
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  };

  const next = async () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await storage.set(ONBOARDING_KEY, "true");
      router.replace("/(auth)/login");
    }
  };

  const skip = async () => {
    await storage.set(ONBOARDING_KEY, "true");
    router.replace("/(auth)/login");
  };

  return (
    <GradientBg>
      <View
        style={[
          styles.topRow,
          { paddingTop: (isWeb ? 67 : insets.top) + 12 },
        ]}
      >
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[c.primary, c.sosGradientStart]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandIcon}
          >
            <Feather name="shield" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[styles.brand, { color: c.foreground }]}>SafeSphere</Text>
        </View>
        <Pressable onPress={skip} hitSlop={10}>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewable.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index: i }) => (
          <SlideView slide={item} active={i === index} />
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? c.primary : c.border,
                width: i === index ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.cta,
          { paddingBottom: (isWeb ? 34 : insets.bottom) + 24 },
        ]}
      >
        <PrimaryButton
          label={index === SLIDES.length - 1 ? "Get started" : "Continue"}
          onPress={next}
        />
      </View>
    </GradientBg>
  );
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  const c = useColors();
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (!active) return;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [active, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.7 }],
    opacity: 0.45 * (1 - pulse.value),
  }));

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.iconRing,
            { backgroundColor: c.primary },
            ringStyle,
          ]}
        />
        <LinearGradient
          colors={[c.primary, c.sosGradientStart]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Feather name={slide.icon} size={42} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>{slide.title}</Text>
      <Text style={[styles.body, { color: c.mutedForeground }]}>
        {slide.body}
      </Text>
      <View
        style={[
          styles.hintBox,
          { backgroundColor: c.secondary, borderColor: c.border },
        ]}
      >
        <Feather name="zap" size={14} color={c.primary} />
        <Text
          style={{
            color: c.secondaryForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 12,
            flex: 1,
          }}
        >
          {slide.hint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 0.4,
  },
  slide: {
    paddingHorizontal: 32,
    paddingTop: 30,
    alignItems: "center",
  },
  iconWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  iconRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c6cff",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 14,
  },
  body: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cta: {
    paddingHorizontal: 24,
  },
});
