/**
 * SafeSphere design tokens — calming lavender → soft blue palette.
 * Risk colors graduate from blue (low) → lavender (medium) → amber (high) → red (critical).
 */

const colors = {
  light: {
    text: "#1a1140",
    tint: "#7c6cff",

    background: "#f7f5ff",
    foreground: "#1a1140",

    card: "#ffffff",
    cardForeground: "#1a1140",

    primary: "#7c6cff",
    primaryForeground: "#ffffff",

    secondary: "#eae4ff",
    secondaryForeground: "#3b2d80",

    muted: "#efebff",
    mutedForeground: "#6f679a",

    accent: "#d6e4ff",
    accentForeground: "#1f3b80",

    destructive: "#ff4d6d",
    destructiveForeground: "#ffffff",

    success: "#3fc594",
    warning: "#ffb547",

    border: "#e3dffb",
    input: "#e3dffb",

    sosGradientStart: "#ff4d6d",
    sosGradientEnd: "#ff7a3d",

    bgGradientStart: "#eee6ff",
    bgGradientMid: "#dde6ff",
    bgGradientEnd: "#f7f5ff",

    riskLow: "#3fc594",
    riskMedium: "#7c6cff",
    riskHigh: "#ffb547",
    riskCritical: "#ff4d6d",
  },

  dark: {
    text: "#f3efff",
    tint: "#a99dff",

    background: "#0d0a23",
    foreground: "#f3efff",

    card: "#1a1640",
    cardForeground: "#f3efff",

    primary: "#a99dff",
    primaryForeground: "#0d0a23",

    secondary: "#241e55",
    secondaryForeground: "#e6dfff",

    muted: "#1f1a47",
    mutedForeground: "#9990c4",

    accent: "#2a3470",
    accentForeground: "#cfd9ff",

    destructive: "#ff5f7d",
    destructiveForeground: "#ffffff",

    success: "#4fd9a8",
    warning: "#ffc266",

    border: "#2a2360",
    input: "#2a2360",

    sosGradientStart: "#ff5f7d",
    sosGradientEnd: "#ff8a4d",

    bgGradientStart: "#160f3d",
    bgGradientMid: "#0f1340",
    bgGradientEnd: "#0d0a23",

    riskLow: "#4fd9a8",
    riskMedium: "#a99dff",
    riskHigh: "#ffc266",
    riskCritical: "#ff5f7d",
  },

  radius: 20,
};

export default colors;
