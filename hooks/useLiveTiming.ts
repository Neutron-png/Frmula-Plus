/**
 * useLiveTiming.ts
 *
 * React hook that manages the F1LiveTimingClient lifecycle.
 *
 * - Creates the client on mount, connects to the official F1 SignalR feed
 * - Subscribes to update + connection events
 * - Polls multiviewer separately for decoded position data (map markers)
 * - Auto-reconnects are handled inside F1LiveTimingClient
 * - Cleans up fully on unmount
 */

import { useEffect, useRef, useState } from "react";
import {
  F1LiveTimingClient,
  fetchLiveDriverPositions,
  isSessionLive,
  isSessionEnded,
  LiveTimingSnapshot,
  LiveDriverPosition,
  LiveDriverTiming,
  LiveRaceControlMessage,
} from "@/services/liveTimingProvider";

// ─── Position poll interval ───────────────────────────────────────────────────
// 1 second during live session; positions come from multiviewer (decoded Position.z)
const POSITION_POLL_MS = 1_000;

// ─── Public types ────────────────────────────────────────────────────────────

export type LiveTimingState =
  | "connecting"   // initial, no data yet
  | "live"         // session active, data flowing
  | "ended"        // session finished
  | "no_session"   // connected but no active session
  | "error";       // connection failed

export interface UseLiveTimingResult {
  state: LiveTimingState;
  snapshot: LiveTimingSnapshot | null;
  positions: LiveDriverPosition[];
  drivers: LiveDriverTiming[];
  raceControlMessages: LiveRaceControlMessage[];
  lapCount: { current: number; total: number } | null;
  isLiveProviderAvailable: boolean;
  lastUpdated: number | null;
  consecutiveErrors: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveTiming(): UseLiveTimingResult {
  const [snapshot, setSnapshot] = useState<LiveTimingSnapshot | null>(null);
  const [positions, setPositions] = useState<LiveDriverPosition[]>([]);
  const [state, setState] = useState<LiveTimingState>("connecting");
  const [isLiveProviderAvailable, setIsLiveProviderAvailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const mountedRef = useRef(true);
  const posTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<F1LiveTimingClient | null>(null);
  const errCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    // ── Create and connect the timing client ─────────────────────────────────
    const client = new F1LiveTimingClient();
    clientRef.current = client;

    const unsubUpdate = client.onUpdate((snap) => {
      if (!mountedRef.current) return;

      setSnapshot(snap);
      setLastUpdated(snap.timestamp);
      setIsLiveProviderAvailable(true);
      errCountRef.current = 0;
      setConsecutiveErrors(0);

      if (isSessionLive(snap)) {
        setState("live");
      } else if (isSessionEnded(snap)) {
        setState("ended");
      } else {
        setState((prev) => (prev === "connecting" ? "no_session" : prev));
      }
    });

    const unsubConn = client.onConnectionChange((connected) => {
      if (!mountedRef.current) return;
      if (!connected) {
        errCountRef.current += 1;
        setConsecutiveErrors(errCountRef.current);
        if (errCountRef.current >= 5 && !isLiveProviderAvailable) {
          setState("error");
        }
      } else {
        // Reset error count on reconnect
        errCountRef.current = 0;
        setConsecutiveErrors(0);
      }
    });

    client.connect().catch((err) => {
      console.warn("[useLiveTiming] connect error:", err);
    });

    // ── Position polling (separate — multiviewer decoded positions) ──────────
    const pollPositions = async () => {
      if (!mountedRef.current) return;
      try {
        const data = await fetchLiveDriverPositions();
        if (data.length > 0 && mountedRef.current) {
          setPositions(data);
        }
      } catch {
        // non-fatal; positions are supplementary
      }
      if (mountedRef.current) {
        posTimerRef.current = setTimeout(pollPositions, POSITION_POLL_MS);
      }
    };
    pollPositions();

    return () => {
      mountedRef.current = false;
      unsubUpdate();
      unsubConn();
      client.disconnect();
      if (posTimerRef.current) {
        clearTimeout(posTimerRef.current);
        posTimerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    snapshot,
    positions,
    drivers: snapshot?.drivers ?? [],
    raceControlMessages: snapshot?.raceControlMessages ?? [],
    lapCount: snapshot?.lapCount ?? null,
    isLiveProviderAvailable,
    lastUpdated,
    consecutiveErrors,
  };
}

// ─── Utilities (used by live.tsx) ────────────────────────────────────────────

export const LIVE_TYRE_SHORT: Record<string, string> = {
  SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W",
  S: "S", M: "M", H: "H", I: "I", W: "W",
  ULTRASOFT: "US", SUPERSOFT: "SS", HYPERSOFT: "HS",
};

/**
 * Convert TrackStatus.Status code to a human-readable banner.
 * "1" = clear, "2" = yellow, "4" = SC, "5" = red, "6" = VSC, "7" = VSC ending
 */
export function trackStatusToFlag(
  status: string
): { label: string; color: string } | null {
  switch (status) {
    case "1": return null;
    case "2": return { label: "YELLOW FLAG",       color: "#FFD700" };
    case "4": return { label: "SAFETY CAR",        color: "#FF8C00" };
    case "5": return { label: "RED FLAG",          color: "#E10600" };
    case "6": return { label: "VIRTUAL SC",        color: "#FF8C00" };
    case "7": return { label: "VIRTUAL SC ENDING", color: "#FFD700" };
    default:  return null;
  }
}

/**
 * Map a live RC message category + flag to an icon name and colour.
 * Mirrors getRaceControlIcon from openf1.ts so live.tsx can use one code path.
 */
export function getLiveRCIcon(
  category: string,
  flag: string | null
): { icon: string; color: string } {
  if (flag) {
    switch (flag.toUpperCase()) {
      case "GREEN":          return { icon: "flag",                  color: "#00D26A" };
      case "YELLOW":         return { icon: "warning",               color: "#FFD700" };
      case "DOUBLE YELLOW":  return { icon: "warning",               color: "#FF8C00" };
      case "RED":            return { icon: "stop-circle",           color: "#E10600" };
      case "CHEQUERED":      return { icon: "checkmark-done-circle", color: "#FFFFFF" };
      case "BLUE":           return { icon: "flag",                  color: "#0066FF" };
      case "BLACK AND WHITE":return { icon: "flag",                  color: "#888888" };
      case "CLEAR":          return { icon: "flag",                  color: "#00D26A" };
      default:               return { icon: "flag",                  color: "#FFD700" };
    }
  }
  if (category === "Flag")       return { icon: "flag",      color: "#FFD700" };
  if (category === "SafetyCar")  return { icon: "car-sport", color: "#FF8C00" };
  if (category === "Drs")        return { icon: "flash",     color: "#00D26A" };
  return { icon: "radio", color: "#888888" };
}
