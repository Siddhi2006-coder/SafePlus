/**
 * AI-style risk scoring. Pure heuristic that combines:
 *  - trigger type (voice/lock-screen → higher)
 *  - repeated triggers in last 24h (signal of escalating distress)
 *  - motion speed (high → fleeing/being moved)
 *  - peak acceleration (high → struggle / impact)
 * Returns a 0–100 score and a discrete level.
 */

export type RiskInputs = {
  trigger: string;
  triggerCount24h: number;
  speed?: number | null;
  accel?: number | null;
  repeated?: boolean | null;
  discreet?: boolean | null;
};

export type RiskOutput = {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  /** Seconds before auto-escalation to nearby helpers fires. */
  escalationSeconds: number;
};

export function computeRisk(input: RiskInputs): RiskOutput {
  let score = 20;

  switch (input.trigger) {
    case "voice":
      score += 25;
      break;
    case "lock-screen":
      score += 20;
      break;
    case "shake":
      score += 18;
      break;
    case "button":
      score += 15;
      break;
    default:
      score += 10;
  }

  if (input.discreet) score += 10;

  // Repeated SOS in the last 24h is a strong signal.
  const repeats = Math.max(0, (input.triggerCount24h ?? 1) - 1);
  score += Math.min(repeats * 12, 25);
  if (input.repeated) score += 8;

  if (typeof input.speed === "number") {
    // 0-3 m/s walking is normal, 3-7 m/s running, 7+ vehicle / dragged
    if (input.speed > 7) score += 18;
    else if (input.speed > 3) score += 8;
  }
  if (typeof input.accel === "number") {
    if (input.accel > 25) score += 15;
    else if (input.accel > 15) score += 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: RiskOutput["level"] = "low";
  let escalationSeconds = 180;
  if (score >= 80) {
    level = "critical";
    escalationSeconds = 30;
  } else if (score >= 60) {
    level = "high";
    escalationSeconds = 60;
  } else if (score >= 35) {
    level = "medium";
    escalationSeconds = 120;
  }

  return { score, level, escalationSeconds };
}

const ADJECTIVES = [
  "Calm",
  "Bright",
  "Brave",
  "Quick",
  "Kind",
  "Sharp",
  "Steady",
  "Quiet",
  "Warm",
  "Clear",
  "Loyal",
  "Swift",
  "Strong",
  "Gentle",
  "Wise",
];
const ANIMALS = [
  "Falcon",
  "Otter",
  "Lynx",
  "Hawk",
  "Wolf",
  "Heron",
  "Tiger",
  "Robin",
  "Bear",
  "Fox",
  "Sparrow",
  "Owl",
  "Stag",
  "Crane",
  "Mouse",
];

export function generateAlias(seed: number | string): string {
  const s = typeof seed === "number" ? seed : hashString(seed);
  const a = ADJECTIVES[s % ADJECTIVES.length];
  const n = ANIMALS[Math.floor(s / ADJECTIVES.length) % ANIMALS.length];
  return `${a} ${n}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
