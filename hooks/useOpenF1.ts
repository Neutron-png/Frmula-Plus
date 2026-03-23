/**
 * hooks/useOpenF1.ts
 *
 * Same hook names, same return types as before — UI files are untouched.
 * Data now comes from Jolpica/Ergast via the rewritten services/openf1.ts.
 * Live timing comes from the F1 SignalR feed via useLiveTiming.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchDrivers,
  fetchMeetings,
  fetchSessions,
  fetchRaceControl,
  fetchPositions,
  fetchStints,
  fetchLaps,
  fetchCircuitData,
  getRaceMeetings,
  getLatestPositions,
  getLatestStints,
  circuitDataToSvgPath,
  OpenF1Driver,
  OpenF1Meeting,
  OpenF1Session,
  OpenF1RaceControl,
  OpenF1Position,
  OpenF1Stint,
  OpenF1Lap,
} from "@/services/openf1";
import { TEAMS } from "@/constants/f1Data";

// ─── Team helpers (used in useOpenF1RaceResults) ──────────────────────────────

const API_TO_LOCAL_TEAM: Record<string, string> = {
  mclaren: "mclaren", ferrari: "ferrari", mercedes: "mercedes",
  red_bull: "redbull", aston_martin: "astonmartin", williams: "williams",
  alpine: "alpine", haas: "haas", rb: "racingbulls",
  racing_bulls: "racingbulls", alphatauri: "racingbulls",
  audi: "audi", sauber: "audi", alfa: "audi", cadillac: "cadillac",
};

// ─── Exported type ─────────────────────────────────────────────────────────────

export interface RaceResultEntry {
  position: number;
  driverNumber: number;
  driverName: string;
  driverAcronym: string;
  teamName: string;
  teamColour: string;
  headshotUrl: string | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useOpenF1Drivers() {
  return useQuery<OpenF1Driver[]>({
    queryKey: ["ergast", "drivers"],
    queryFn: () => fetchDrivers(),
    staleTime: 60 * 60 * 1000, // 1 hour — driver roster rarely changes mid-season
    retry: 2,
  });
}

export function useOpenF1Meetings(year?: number) {
  return useQuery<OpenF1Meeting[]>({
    queryKey: ["ergast", "meetings", year || new Date().getFullYear()],
    queryFn: () => fetchMeetings(year),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    select: getRaceMeetings,
  });
}

export function useOpenF1AllMeetings(year?: number) {
  return useQuery<OpenF1Meeting[]>({
    queryKey: ["ergast", "meetings", year || new Date().getFullYear()],
    queryFn: () => fetchMeetings(year),
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}

export function useOpenF1Sessions(meetingKey: number | undefined) {
  return useQuery<OpenF1Session[]>({
    queryKey: ["ergast", "sessions", meetingKey],
    queryFn: () => fetchSessions(meetingKey!),
    enabled: !!meetingKey,
    staleTime: 24 * 60 * 60 * 1000, // Session schedule doesn't change
    retry: 2,
    select: (data) =>
      data.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()),
  });
}

export function useOpenF1RaceControl(sessionKey: number | "latest" | undefined) {
  // Race control messages are only available during live sessions via the
  // F1 SignalR feed (useLiveTiming). Ergast does not provide them.
  // This hook returns [] so historical views degrade gracefully.
  return useQuery<OpenF1RaceControl[]>({
    queryKey: ["ergast", "raceControl", sessionKey],
    queryFn: () => fetchRaceControl(sessionKey!),
    enabled: !!sessionKey,
    staleTime: Infinity,
    retry: 0,
    select: (data) =>
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
}

export function useOpenF1Positions(sessionKey: number | undefined) {
  return useQuery<OpenF1Position[]>({
    queryKey: ["ergast", "positions", sessionKey],
    queryFn: () => fetchPositions(sessionKey!),
    enabled: !!sessionKey,
    staleTime: 30 * 60 * 1000,
    retry: 2,
    select: getLatestPositions,
  });
}

export function useOpenF1Stints(sessionKey: number | undefined) {
  // Tyre stint data is not available in Ergast.
  return useQuery<OpenF1Stint[]>({
    queryKey: ["ergast", "stints", sessionKey],
    queryFn: () => fetchStints(sessionKey!),
    enabled: !!sessionKey,
    staleTime: Infinity,
    retry: 0,
  });
}

export function useOpenF1Laps(sessionKey: number | undefined) {
  // Lap data is not available in Ergast.
  return useQuery<OpenF1Lap[]>({
    queryKey: ["ergast", "laps", sessionKey],
    queryFn: () => fetchLaps(sessionKey!),
    enabled: !!sessionKey,
    staleTime: Infinity,
    retry: 0,
  });
}

export function useOpenF1CircuitPath(circuitKey: number | undefined, year: number) {
  return useQuery<string>({
    queryKey: ["multiviewer", "circuitPath", circuitKey, year],
    queryFn: async () => {
      if (!circuitKey) return "";
      const data = await fetchCircuitData(circuitKey, year);
      if (!data) return "";
      return circuitDataToSvgPath(data);
    },
    enabled: !!circuitKey,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useOpenF1MeetingByCountry(countryName: string | undefined, year?: number) {
  return useQuery<OpenF1Meeting | null>({
    queryKey: ["ergast", "meetingByCountry", countryName, year || new Date().getFullYear()],
    queryFn: async () => {
      if (!countryName) return null;
      const meetings = await fetchMeetings(year || new Date().getFullYear());
      const needle = countryName.toLowerCase();
      const found = meetings.find(
        (m) =>
          m.country_name.toLowerCase().includes(needle) ||
          needle.includes(m.country_name.toLowerCase()) ||
          m.location.toLowerCase().includes(needle) ||
          m.circuit_short_name.toLowerCase().includes(needle)
      );
      return found || null;
    },
    enabled: !!countryName,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}

/**
 * useOpenF1RaceResults
 *
 * For the circuit detail page — builds final race standings directly from
 * Jolpica results (driver name, team, colour, position).
 * The session_key encodes the round: round = Math.floor(key / 10).
 */
export function useOpenF1RaceResults(sessionKey: number | undefined, isCompleted = false) {
  const staleTime = isCompleted ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;

  // Fetch race results and driver list in parallel
  const positionsQuery = useQuery<OpenF1Position[]>({
    queryKey: ["ergast", "raceResults", "positions", sessionKey],
    queryFn: () => fetchPositions(sessionKey!),
    enabled: !!sessionKey,
    staleTime,
    retry: 2,
    select: getLatestPositions,
  });

  const driversQuery = useQuery<OpenF1Driver[]>({
    queryKey: ["ergast", "drivers"],
    queryFn: () => fetchDrivers(),
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

  const results = useMemo((): RaceResultEntry[] => {
    if (!positionsQuery.data || !driversQuery.data) return [];
    const driverMap: Record<number, OpenF1Driver> = {};
    driversQuery.data.forEach((d) => { driverMap[d.driver_number] = d; });

    return positionsQuery.data.map((pos) => {
      const driver = driverMap[pos.driver_number];
      const teamColourRaw = driver?.team_colour || "888888";
      const teamColour = teamColourRaw.startsWith("#") ? teamColourRaw : `#${teamColourRaw}`;
      return {
        position: pos.position,
        driverNumber: pos.driver_number,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : `#${pos.driver_number}`,
        driverAcronym: driver?.name_acronym || `#${pos.driver_number}`,
        teamName: driver?.team_name || "",
        teamColour,
        headshotUrl: driver?.headshot_url || null,
      };
    });
  }, [positionsQuery.data, driversQuery.data]);

  return {
    results,
    isLoading: positionsQuery.isLoading || driversQuery.isLoading,
    isError: !!(positionsQuery.error || driversQuery.error),
    hasData: results.length > 0,
  };
}
