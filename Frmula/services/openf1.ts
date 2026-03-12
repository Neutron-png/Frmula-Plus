import { fetch } from "expo/fetch";

const BASE_URL = "https://api.openf1.org/v1";

export interface OpenF1Driver {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  country_flag: string | null;
  circuit_key: number;
  circuit_short_name: string;
  circuit_type: string | null;
  circuit_info_url: string | null;
  circuit_image: string | null;
  gmt_offset: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface OpenF1Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_key: number;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
}

export interface OpenF1RaceControl {
  meeting_key: number;
  session_key: number;
  date: string;
  driver_number: number | null;
  lap_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  qualifying_phase: string | null;
  message: string;
}

export interface OpenF1Position {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
}

export interface OpenF1Stint {
  meeting_key: number;
  session_key: number;
  stint_number: number;
  driver_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
}

export interface OpenF1Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  lap_duration: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  is_pit_out_lap: boolean;
  st_speed: number | null;
}

export interface CircuitData {
  x: number[];
  y: number[];
  circuitKey: number;
  circuitName: string;
  rotation: number;
}

export const DRIVER_NUMBER_TO_ID: Record<number, string> = {
  1: "norris",
  3: "max_verstappen",
  5: "bortoleto",
  6: "hadjar",
  10: "gasly",
  11: "perez",
  12: "antonelli",
  14: "alonso",
  16: "leclerc",
  18: "stroll",
  23: "albon",
  27: "hulkenberg",
  30: "lawson",
  31: "ocon",
  41: "arvid_lindblad",
  43: "colapinto",
  44: "hamilton",
  55: "sainz",
  63: "russell",
  77: "bottas",
  81: "piastri",
  87: "bearman",
};

async function fetchOpenF1<T>(endpoint: string, params?: Record<string, string | number>): Promise<T[]> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenF1 API error: ${res.status}`);
  const data = await res.json();
  if (data?.detail === "No results found.") return [];
  return Array.isArray(data) ? data : [];
}

export async function fetchDrivers(sessionKey?: number): Promise<OpenF1Driver[]> {
  return fetchOpenF1<OpenF1Driver>("/drivers", {
    session_key: sessionKey || "latest",
  });
}

export async function fetchMeetings(year?: number): Promise<OpenF1Meeting[]> {
  return fetchOpenF1<OpenF1Meeting>("/meetings", {
    year: year || new Date().getFullYear(),
  });
}

export async function fetchSessions(meetingKey: number): Promise<OpenF1Session[]> {
  return fetchOpenF1<OpenF1Session>("/sessions", {
    meeting_key: meetingKey,
  });
}

export async function fetchRaceControl(sessionKey: number | "latest"): Promise<OpenF1RaceControl[]> {
  return fetchOpenF1<OpenF1RaceControl>("/race_control", {
    session_key: sessionKey,
  });
}

export async function fetchPositions(sessionKey: number): Promise<OpenF1Position[]> {
  return fetchOpenF1<OpenF1Position>("/position", {
    session_key: sessionKey,
  });
}

export async function fetchStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return fetchOpenF1<OpenF1Stint>("/stints", {
    session_key: sessionKey,
  });
}

export async function fetchLaps(sessionKey: number, driverNumber?: number): Promise<OpenF1Lap[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  return fetchOpenF1<OpenF1Lap>("/laps", params);
}

export async function fetchCircuitData(circuitKey: number, year: number): Promise<CircuitData | null> {
  try {
    const url = `https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.x && data.y) {
      return {
        x: data.x,
        y: data.y,
        circuitKey: data.circuitKey,
        circuitName: data.circuitName || "",
        rotation: data.rotation || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function getLatestPositions(positions: OpenF1Position[]): OpenF1Position[] {
  const latest: Record<number, OpenF1Position> = {};
  positions.forEach((p) => {
    if (!latest[p.driver_number] || new Date(p.date) > new Date(latest[p.driver_number].date)) {
      latest[p.driver_number] = p;
    }
  });
  return Object.values(latest).sort((a, b) => a.position - b.position);
}

export function getLatestStints(stints: OpenF1Stint[]): Record<number, OpenF1Stint> {
  const latest: Record<number, OpenF1Stint> = {};
  stints.forEach((s) => {
    if (!latest[s.driver_number] || s.stint_number > latest[s.driver_number].stint_number) {
      latest[s.driver_number] = s;
    }
  });
  return latest;
}

export function circuitDataToSvgPath(data: CircuitData): string {
  if (!data.x || !data.y || data.x.length < 2) return "";
  const step = Math.max(1, Math.floor(data.x.length / 150));
  let path = `M ${data.x[0]} ${data.y[0]}`;
  for (let i = step; i < data.x.length; i += step) {
    path += ` L ${data.x[i]} ${data.y[i]}`;
  }
  path += ` L ${data.x[data.x.length - 1]} ${data.y[data.y.length - 1]} Z`;
  return path;
}

export function getRaceMeetings(meetings: OpenF1Meeting[]): OpenF1Meeting[] {
  return meetings
    .filter((m) => !m.meeting_name.toLowerCase().includes("testing"))
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
}

export function getMeetingStatus(meeting: OpenF1Meeting): "completed" | "live" | "upcoming" {
  const now = new Date();
  const start = new Date(meeting.date_start);
  const end = new Date(meeting.date_end);
  if (now > end) return "completed";
  if (now >= start && now <= end) return "live";
  return "upcoming";
}

export function formatDateRange(dateStart: string, dateEnd: string): string {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = end.toLocaleDateString("en-US", { month: "short" });
  return `${startDay}-${endDay} ${month}`;
}

export function getSessionIcon(sessionType: string): string {
  switch (sessionType) {
    case "Race": return "flag";
    case "Qualifying": return "timer-outline";
    case "Sprint": return "flash-outline";
    case "Sprint Qualifying": return "flash-outline";
    case "Sprint Shootout": return "flash-outline";
    default: return "speedometer-outline";
  }
}

export function getRaceControlIcon(category: string, flag?: string | null): { icon: string; color: string } {
  if (category === "Flag") {
    switch (flag) {
      case "GREEN": return { icon: "flag", color: "#00D26A" };
      case "YELLOW": return { icon: "warning", color: "#FFD700" };
      case "DOUBLE YELLOW": return { icon: "warning", color: "#FF8C00" };
      case "RED": return { icon: "stop-circle", color: "#E10600" };
      case "CHEQUERED": return { icon: "checkmark-done-circle", color: "#FFFFFF" };
      case "BLUE": return { icon: "flag", color: "#0066FF" };
      case "BLACK AND WHITE": return { icon: "flag", color: "#888" };
      case "CLEAR": return { icon: "flag", color: "#00D26A" };
      default: return { icon: "flag", color: "#FFD700" };
    }
  }
  if (category === "SafetyCar") return { icon: "car-sport", color: "#FF8C00" };
  if (category === "Drs") return { icon: "flash", color: "#00D26A" };
  return { icon: "radio", color: "#888" };
}

const COUNTRY_FLAGS: Record<string, string> = {
  AUS: "\u{1F1E6}\u{1F1FA}", CHN: "\u{1F1E8}\u{1F1F3}", JPN: "\u{1F1EF}\u{1F1F5}",
  BHR: "\u{1F1E7}\u{1F1ED}", KSA: "\u{1F1F8}\u{1F1E6}", USA: "\u{1F1FA}\u{1F1F8}",
  CAN: "\u{1F1E8}\u{1F1E6}", MCO: "\u{1F1F2}\u{1F1E8}", ESP: "\u{1F1EA}\u{1F1F8}",
  AUT: "\u{1F1E6}\u{1F1F9}", GBR: "\u{1F1EC}\u{1F1E7}", BEL: "\u{1F1E7}\u{1F1EA}",
  HUN: "\u{1F1ED}\u{1F1FA}", NLD: "\u{1F1F3}\u{1F1F1}", ITA: "\u{1F1EE}\u{1F1F9}",
  AZE: "\u{1F1E6}\u{1F1FF}", SGP: "\u{1F1F8}\u{1F1EC}", MEX: "\u{1F1F2}\u{1F1FD}",
  BRA: "\u{1F1E7}\u{1F1F7}", QAT: "\u{1F1F6}\u{1F1E6}", ARE: "\u{1F1E6}\u{1F1EA}",
  UAE: "\u{1F1E6}\u{1F1EA}", BRN: "\u{1F1E7}\u{1F1ED}",
};

export function getCountryFlag(countryCode: string): string {
  return COUNTRY_FLAGS[countryCode] || "\u{1F3C1}";
}
