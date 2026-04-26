import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function SectionCard({ children, style }: Props) {
  const c = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderRadius: c.radius,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderWidth: 1,
    shadowColor: "#1a1140",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
});
