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
  useReportMotion,
  useTriggerSos,
  useUpdateLocation,
  useCancelIncident,
  useResolveIncident,
  type Incident,
  type EscalationResult,
  type RiskUpdate,
} from "@workspace/api-client-react";

import { useAuth } from "@/providers/AuthProvider";
import { getCurrentCoords, requestLocationPermission } from "@/lib/location";
import { isVoiceSupported, startVoiceListener } from "@/lib/voice";
import { storage } from "@/lib/storage";

const VOICE_PREF_KEY = "safepulse.voice.enabled";
const DISCREET_PREF_KEY = "safepulse.discreet.enabled";
const LOC_QUEUE_KEY = "safepulse.locqueue";
const TRIGGER_HISTORY_KEY = "safepulse.triggers";

export type RecordingStatus = "idle" | "recording" | "uploaded";

type LocSample = {
  incidentId: number;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  ts: number;
};

type SosState = {
  activeIncident: Incident | null;
  triggering: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  discreet: boolean;
  countdown: number | null;
  escalation: EscalationResult | null;
  recordingStatus: RecordingStatus;
  riskLevel: "low" | "medium" | "high" | "critical" | null;
  riskScore: number | null;
  routePoints: { lat: number; lng: number }[];
  queuedLocations: number;
  recordingChunks: number;
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

const LOCATION_INTERVAL_MS = 8000;
const RECORDING_CHUNK_MS = 6000;

function escalationFromRisk(level: string | null | undefined): number {
  switch (level) {
    case "critical":
      return 4;
    case "high":
      return 6;
    case "medium":
      return 10;
    default:
      return 14;
  }
}

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
  const motionMut = useReportMotion();
  const updateLoc = useUpdateLocation();
  const cancelMut = useCancelIncident();
  const resolveMut = useResolveIncident();

  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [discreet, setDiscreetState] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [escalation, setEscalation] = useState<EscalationResult | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [riskUpdate, setRiskUpdate] = useState<RiskUpdate | null>(null);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [queuedLocations, setQueuedLocations] = useState(0);
  const [recordingChunks, setRecordingChunks] = useState(0);

  const activeIncident: Incident | null = activeQuery.data?.incident ?? null;

  const escalationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceListenerRef = useRef<{ stop: () => void } | null>(null);
  const voiceSupported = useMemo(() => isVoiceSupported(), []);

  // Reset route + chunks when active incident changes
  useEffect(() => {
    if (!activeIncident) {
      setRoutePoints([]);
      setRecordingChunks(0);
      return;
    }
    setRoutePoints((prev) =>
      prev.length === 0
        ? [{ lat: activeIncident.startLat, lng: activeIncident.startLng }]
        : prev,
    );
  }, [activeIncident?.id]);

  // Load preferences
  useEffect(() => {
    (async () => {
      const [v, d, queued] = await Promise.all([
        storage.get(VOICE_PREF_KEY),
        storage.get(DISCREET_PREF_KEY),
        storage.getJSON<LocSample[]>(LOC_QUEUE_KEY),
      ]);
      if (v === "true") setVoiceEnabledState(true);
      if (d === "true") setDiscreetState(true);
      if (queued && Array.isArray(queued)) setQueuedLocations(queued.length);
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

  const enqueueLocation = useCallback(async (sample: LocSample) => {
    const queue = (await storage.getJSON<LocSample[]>(LOC_QUEUE_KEY)) ?? [];
    queue.push(sample);
    // cap to 60 items
    while (queue.length > 60) queue.shift();
    await storage.setJSON(LOC_QUEUE_KEY, queue);
    setQueuedLocations(queue.length);
  }, []);

  const flushLocationQueue = useCallback(async () => {
    const queue = (await storage.getJSON<LocSample[]>(LOC_QUEUE_KEY)) ?? [];
    if (queue.length === 0) return;
    const remaining: LocSample[] = [];
    for (const item of queue) {
      try {
        await updateLoc.mutateAsync({
          data: {
            incidentId: item.incidentId,
            lat: item.lat,
            lng: item.lng,
            accuracy: item.accuracy,
            speed: item.speed,
          },
        });
      } catch {
        remaining.push(item);
      }
    }
    await storage.setJSON(LOC_QUEUE_KEY, remaining);
    setQueuedLocations(remaining.length);
  }, [updateLoc]);

  const recordTriggerHistory = useCallback(
    async (when: number) => {
      const list = (await storage.getJSON<number[]>(TRIGGER_HISTORY_KEY)) ?? [];
      const cutoff = when - 24 * 60 * 60 * 1000;
      const recent = list.filter((t) => t >= cutoff);
      recent.push(when);
      while (recent.length > 20) recent.shift();
      await storage.setJSON(TRIGGER_HISTORY_KEY, recent);
      return recent.length;
    },
    [],
  );

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
      setRiskUpdate(null);
      setRoutePoints([{ lat, lng }]);
      setRecordingChunks(0);

      const repeats = await recordTriggerHistory(Date.now());

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

      // After a tiny delay, send a motion sample so the server can refine risk
      // for repeated/critical triggers.
      if (repeats > 1) {
        try {
          const refreshed = await activeQuery.refetch();
          const inc = refreshed.data?.incident;
          if (inc) {
            const update = await motionMut.mutateAsync({
              id: inc.id,
              data: {
                speed: 0,
                accel: null,
                repeated: true,
              },
            });
            setRiskUpdate(update);
          }
        } catch {
          /* ignore */
        }
      }
    },
    [activeQuery, discreet, isAuthed, motionMut, recordTriggerHistory, trigSos],
  );

  const cancelActive = useCallback(async () => {
    if (!activeIncident) return;
    await cancelMut.mutateAsync({ id: activeIncident.id });
    setCountdown(null);
    setEscalation(null);
    setRecordingStatus("idle");
    setRecordingChunks(0);
    await activeQuery.refetch();
  }, [activeIncident, cancelMut, activeQuery]);

  const resolveActive = useCallback(async () => {
    if (!activeIncident) return;
    await resolveMut.mutateAsync({ id: activeIncident.id });
    setCountdown(null);
    setEscalation(null);
    setRecordingStatus("idle");
    setRecordingChunks(0);
    await activeQuery.refetch();
  }, [activeIncident, resolveMut, activeQuery]);

  const refreshActive = useCallback(() => {
    activeQuery.refetch();
  }, [activeQuery]);

  // Active incident side-effects: countdown to escalation, location updates, motion samples, recording chunks
  useEffect(() => {
    if (escalationTimerRef.current) {
      clearInterval(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current);
      locationTimerRef.current = null;
    }
    if (motionTimerRef.current) {
      clearInterval(motionTimerRef.current);
      motionTimerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (!activeIncident || activeIncident.status !== "active") {
      setCountdown(null);
      setRecordingStatus("idle");
      return;
    }

    setRecordingStatus("recording");

    const incidentId = activeIncident.id;
    const effectiveLevel: string =
      riskUpdate?.riskLevel ?? activeIncident.riskLevel ?? "medium";

    if (!activeIncident.escalated) {
      const seconds = escalationFromRisk(effectiveLevel);
      setCountdown(seconds);
      escalationTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            (async () => {
              try {
                const result = await escalateMut.mutateAsync({ id: incidentId });
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

    // Periodic location updates with offline queue fallback
    const pushLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) return;
        const c = await getCurrentCoords();
        setRoutePoints((prev) => {
          const next = [...prev, { lat: c.lat, lng: c.lng }];
          while (next.length > 30) next.shift();
          return next;
        });

        // Try to flush queued samples first
        await flushLocationQueue();

        try {
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
          await enqueueLocation({
            incidentId,
            lat: c.lat,
            lng: c.lng,
            accuracy: c.accuracy,
            speed: c.speed,
            ts: Date.now(),
          });
        }
      } catch {
        /* ignore */
      }
    };
    pushLocation();
    locationTimerRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);

    // Periodic motion sample (simulated speed/accel) so risk score evolves.
    motionTimerRef.current = setInterval(() => {
      const speed = Math.random() * 4; // 0-4 m/s typical walking-running
      motionMut
        .mutateAsync({
          id: incidentId,
          data: { speed, accel: null, repeated: false },
        })
        .then((r) => setRiskUpdate(r))
        .catch(() => undefined);
    }, 9000);

    // Continuous evidence chunk simulation: a new chunk every 6s
    chunkTimerRef.current = setInterval(() => {
      setRecordingChunks((n) => n + 1);
    }, RECORDING_CHUNK_MS);

    return () => {
      if (escalationTimerRef.current) {
        clearInterval(escalationTimerRef.current);
        escalationTimerRef.current = null;
      }
      if (locationTimerRef.current) {
        clearInterval(locationTimerRef.current);
        locationTimerRef.current = null;
      }
      if (motionTimerRef.current) {
        clearInterval(motionTimerRef.current);
        motionTimerRef.current = null;
      }
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, [
    activeIncident?.id,
    activeIncident?.status,
    activeIncident?.escalated,
    activeIncident?.riskLevel,
    riskUpdate?.riskLevel,
    escalateMut,
    updateLoc,
    motionMut,
    activeQuery,
    flushLocationQueue,
    enqueueLocation,
  ]);

  // Mark "uploaded" once at least one chunk has been processed
  useEffect(() => {
    if (recordingChunks > 0 && recordingStatus === "recording") {
      setRecordingStatus("uploaded");
    }
  }, [recordingChunks, recordingStatus]);

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

  const riskLevel = (riskUpdate?.riskLevel ??
    activeIncident?.riskLevel ??
    null) as SosState["riskLevel"];
  const riskScore = riskUpdate?.riskScore ?? activeIncident?.riskScore ?? null;

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
      riskLevel,
      riskScore,
      routePoints,
      queuedLocations,
      recordingChunks,
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
      riskLevel,
      riskScore,
      routePoints,
      queuedLocations,
      recordingChunks,
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
