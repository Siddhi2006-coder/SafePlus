import { Platform } from "react-native";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export type VoiceListener = {
  stop: () => void;
};

const TRIGGER_PHRASES = [
  "hey safepulse",
  "safe pulse help",
  "safepulse help",
  "help me",
];

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function startVoiceListener(onTrigger: () => void): VoiceListener {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return { stop: () => {} };
  }
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let stopped = false;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last && last[0] ? last[0].transcript.toLowerCase() : "";
    if (TRIGGER_PHRASES.some((p) => transcript.includes(p))) {
      onTrigger();
    }
  };
  recognition.onerror = () => {};
  recognition.onend = () => {
    if (!stopped) {
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    }
  };
  try {
    recognition.start();
  } catch {
    /* ignore */
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
