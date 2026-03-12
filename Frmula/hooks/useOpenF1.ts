import { useQuery } from "@tanstack/react-query";
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

export function useOpenF1Drivers() {
  return useQuery<OpenF1Driver[]>({
    queryKey: ["openf1", "drivers"],
    queryFn: () => fetchDrivers(),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function useOpenF1Meetings(year?: number) {
  return useQuery<OpenF1Meeting[]>({
    queryKey: ["openf1", "meetings", year || new Date().getFullYear()],
    queryFn: () => fetchMeetings(year),
    staleTime: 60 * 60 * 1000,
    retry: 2,
    select: getRaceMeetings,
  });
}

export function useOpenF1AllMeetings(year?: number) {
  return useQuery<OpenF1Meeting[]>({
    queryKey: ["openf1", "meetings", year || new Date().getFullYear()],
    queryFn: () => fetchMeetings(year),
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}

export function useOpenF1Sessions(meetingKey: number | undefined) {
  return useQuery<OpenF1Session[]>({
    queryKey: ["openf1", "sessions", meetingKey],
    queryFn: () => fetchSessions(meetingKey!),
    enabled: !!meetingKey,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    select: (data) =>
      data.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()),
  });
}

export function useOpenF1RaceControl(sessionKey: number | "latest" | undefined) {
  return useQuery<OpenF1RaceControl[]>({
    queryKey: ["openf1", "raceControl", sessionKey],
    queryFn: () => fetchRaceControl(sessionKey!),
    enabled: !!sessionKey,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
    select: (data) =>
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
}

export function useOpenF1Positions(sessionKey: number | undefined) {
  return useQuery<OpenF1Position[]>({
    queryKey: ["openf1", "positions", sessionKey],
    queryFn: () => fetchPositions(sessionKey!),
    enabled: !!sessionKey,
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
    retry: 1,
    select: getLatestPositions,
  });
}

export function useOpenF1Stints(sessionKey: number | undefined) {
  return useQuery<OpenF1Stint[]>({
    queryKey: ["openf1", "stints", sessionKey],
    queryFn: () => fetchStints(sessionKey!),
    enabled: !!sessionKey,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });
}

export function useOpenF1Laps(sessionKey: number | undefined) {
  return useQuery<OpenF1Lap[]>({
    queryKey: ["openf1", "laps", sessionKey],
    queryFn: () => fetchLaps(sessionKey!),
    enabled: !!sessionKey,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });
}

export function useOpenF1CircuitPath(circuitKey: number | undefined, year: number) {
  return useQuery<string>({
    queryKey: ["openf1", "circuitPath", circuitKey, year],
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
