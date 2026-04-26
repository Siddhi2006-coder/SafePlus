import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  getGetActiveIncidentQueryKey,
  useEscalateNearby,
  useGetActiveIncident,
  useTriggerSos,
  useUpdateLocation,
  useCancelIncident,
  useResolveIncident,
  type Incident,
  type EscalationResult,
} from "@workspace/api-client-react";

import { useAuth } from "@/providers/AuthProvider";
import { getCurrentCoords, requestLocationPermission } from "@/lib/location";
import { isVoiceSupported, startVoiceListener } from "@/lib/voice";
import { storage } from "@/lib/storage";

const VOICE_PREF_KEY = "safepulse.voice.enabled";
const DISCREET_PREF_KEY = "safepulse.discreet.enabled";

export type RecordingStatus = "idle" | "recording" | "uploaded";

type SosState = {
  activeIncident: Incident | null;
  triggering: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  discreet: boolean;
  countdown: number | null;
  escalation: EscalationResult | null;
  recordingStatus: RecordingStatus;
  trigger: (
    source: "button" | "voice" | "lock-screen" | "shake",
  ) => Promise<void>;
  cancelActive: () => Promise<void>;
  resolveActive: () => Promise<void>;
  setVoiceEnabled: (enabled: boolean) => void;
  setDiscreet: (enabled: boolean) => void;
  refreshActive: () => void;
};

const SosContext = createContext<SosState | null>(null);

const ESCALATION_SECONDS = 8;
const LOCATION_INTERVAL_MS = 8000;

export function SosProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const isAuthed = !!token;

  const activeQuery = useGetActiveIncident({
    query: {
      enabled: isAuthed,
      refetchInterval: 6000,
      queryKey: getGetActiveIncidentQueryKey(),
    },
  });

  const trigSos = useTriggerSos();
  const escalateMut = useEscalateNearby();
  const updateLoc = useUpdateLocation();
  const cancelMut = useCancelIncident();
  const resolveMut = useResolveIncident();

  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [discreet, setDiscreetState] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [escalation, setEscalation] = useState<EscalationResult | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");

  const activeIncident: Incident | null = activeQuery.data?.incident ?? null;

  const escalationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceListenerRef = useRef<{ stop: () => void } | null>(null);
  const voiceSupported = useMemo(() => isVoiceSupported(), []);

  // Load preferences
  useEffect(() => {
    (async () => {
      const [v, d] = await Promise.all([
        storage.get(VOICE_PREF_KEY),
        storage.get(DISCREET_PREF_KEY),
      ]);
      if (v === "true") setVoiceEnabledState(true);
      if (d === "true") setDiscreetState(true);
    })();
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    storage.set(VOICE_PREF_KEY, enabled ? "true" : "false");
  }, []);

  const setDiscreet = useCallback((enabled: boolean) => {
    setDiscreetState(enabled);
    storage.set(DISCREET_PREF_KEY, enabled ? "true" : "false");
  }, []);

  const trigger = useCallback(
    async (source: "button" | "voice" | "lock-screen" | "shake") => {
      if (!isAuthed) return;
      try {
        if (Platform.OS !== "web" && !discreet) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } catch {
        /* ignore */
      }

      const granted = await requestLocationPermission();
      let lat = 37.7749;
      let lng = -122.4194;
      let accuracy: number | null = null;
      if (granted) {
        try {
          const c = await getCurrentCoords();
          lat = c.lat;
          lng = c.lng;
          accuracy = c.accuracy;
        } catch {
          /* fall back to default */
        }
      }

      setEscalation(null);
      await trigSos.mutateAsync({
        data: {
          trigger: source,
          lat,
          lng,
          accuracy,
          discreet,
          message: null,
        },
      });
      await activeQuery.refetch();
    },
    [activeQuery, discreet, isAuthed, trigSos],
  );

  const cancelActive = useCallback(async () => {
    if (!activeIncident) return;
    await cancelMut.mutateAsync({ id: activeIncident.id });
    setCountdown(null);
    setEscalation(null);
    setRecordingStatus("idle");
    await activeQuery.refetch();
  }, [activeIncident, cancelMut, activeQuery]);

  const resolveActive = useCallback(async () => {
    if (!activeIncident) return;
    await resolveMut.mutateAsync({ id: activeIncident.id });
    setCountdown(null);
    setEscalation(null);
    setRecordingStatus("idle");
    await activeQuery.refetch();
  }, [activeIncident, resolveMut, activeQuery]);

  const refreshActive = useCallback(() => {
    activeQuery.refetch();
  }, [activeQuery]);

  // Active incident side-effects: countdown to escalation + recurring location updates
  useEffect(() => {
    if (escalationTimerRef.current) {
      clearInterval(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current);
      locationTimerRef.current = null;
    }

    if (!activeIncident || activeIncident.status !== "active") {
      setCountdown(null);
      setRecordingStatus("idle");
      return;
    }

    setRecordingStatus("recording");
    if (!activeIncident.escalated) {
      setCountdown(ESCALATION_SECONDS);
      escalationTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Escalate
            (async () => {
              try {
                const result = await escalateMut.mutateAsync({
                  id: activeIncident.id,
                });
                setEscalation(result);
                await activeQuery.refetch();
              } catch {
                /* ignore */
              }
            })();
            if (escalationTimerRef.current) {
              clearInterval(escalationTimerRef.current);
              escalationTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    // Periodic location updates while incident is active
    const incidentId = activeIncident.id;
    const pushLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) return;
        const c = await getCurrentCoords();
        await updateLoc.mutateAsync({
          data: {
            incidentId,
            lat: c.lat,
            lng: c.lng,
            accuracy: c.accuracy,
            speed: c.speed,
          },
        });
      } catch {
        /* ignore */
      }
    };
    pushLocation();
    locationTimerRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);

    return () => {
      if (escalationTimerRef.current) {
        clearInterval(escalationTimerRef.current);
        escalationTimerRef.current = null;
      }
      if (locationTimerRef.current) {
        clearInterval(locationTimerRef.current);
        locationTimerRef.current = null;
      }
    };
  }, [activeIncident, escalateMut, updateLoc, activeQuery]);

  // Simulate "recording uploaded" status flag once a few seconds in
  useEffect(() => {
    if (recordingStatus !== "recording") return;
    const t = setTimeout(() => setRecordingStatus("uploaded"), 5000);
    return () => clearTimeout(t);
  }, [recordingStatus]);

  // Voice listener (web only)
  useEffect(() => {
    if (!voiceEnabled || !voiceSupported || !isAuthed) {
      voiceListenerRef.current?.stop();
      voiceListenerRef.current = null;
      return;
    }
    voiceListenerRef.current = startVoiceListener(() => {
      trigger("voice");
    });
    return () => {
      voiceListenerRef.current?.stop();
      voiceListenerRef.current = null;
    };
  }, [voiceEnabled, voiceSupported, isAuthed, trigger]);

  const value = useMemo<SosState>(
    () => ({
      activeIncident,
      triggering: trigSos.isPending,
      voiceEnabled,
      voiceSupported,
      discreet,
      countdown,
      escalation,
      recordingStatus,
      trigger,
      cancelActive,
      resolveActive,
      setVoiceEnabled,
      setDiscreet,
      refreshActive,
    }),
    [
      activeIncident,
      trigSos.isPending,
      voiceEnabled,
      voiceSupported,
      discreet,
      countdown,
      escalation,
      recordingStatus,
      trigger,
      cancelActive,
      resolveActive,
      setVoiceEnabled,
      setDiscreet,
      refreshActive,
    ],
  );

  return <SosContext.Provider value={value}>{children}</SosContext.Provider>;
}

export function useSos(): SosState {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error("useSos must be used inside SosProvider");
  return ctx;
}
