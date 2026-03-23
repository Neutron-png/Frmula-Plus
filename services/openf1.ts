/**
 * services/openf1.ts
 *
 * DATA PROVIDER: Jolpica/Ergast API (https://api.jolpi.ca/ergast/f1) + multiviewer circuits
 * OpenF1 has been fully removed. All type names and utility functions are preserved
 * so every UI file continues to work with zero changes.
 *
 * Live session data (positions, race control, timing) comes from the F1 SignalR
 * feed via useLiveTiming — NOT from this file.
 *
 * This file handles:
 *  - Race calendar / meetings  →  Jolpica /f1/{year}.json
 *  - Session schedules         →  synthesised from Jolpica race objects
 *  - Historical race results   →  Jolpica /f1/{year}/{round}/results.json
 *  - Qualifying results        →  Jolpica /f1/{year}/{round}/qualifying.json
 *  - Driver list               →  Jolpica /f1/current/drivers.json
 *  - Circuit SVG path          →  multiviewer.app circuits API (unchanged)
 *  - Stints / laps / RC msgs   →  not in Ergast → return [] (live feed covers this)
 */

import { fetch } from "expo/fetch";

// ─── Endpoints ────────────────────────────────────────────────────────────────
const JOLPICA = "https://api.jolpi.ca/ergast/f1";
const MULTIVIEWER_CIRCUITS = "https://api.multiviewer.app/api/v1/circuits";

// ─── Team mappings (Ergast constructorId → local teamId) ─────────────────────
const API_TO_LOCAL_TEAM: Record<string, string> = {
  mclaren: "mclaren",
  ferrari: "ferrari",
  mercedes: "mercedes",
  red_bull: "redbull",
  aston_martin: "astonmartin",
  williams: "williams",
  alpine: "alpine",
  haas: "haas",
  rb: "racingbulls",
  racing_bulls: "racingbulls",
  alphatauri: "racingbulls",
  audi: "audi",
  sauber: "audi",
  alfa: "audi",
  cadillac: "cadillac",
};

// Team colours (hex without #, matching f1Data.ts)
const TEAM_COLORS: Record<string, string> = {
  mclaren: "FF8000",
  ferrari: "E8002D",
  mercedes: "27F4D2",
  redbull: "3671C6",
  astonmartin: "229971",
  williams: "64C4FF",
  alpine: "FF87BC",
  racingbulls: "6692FF",
  haas: "B6BABD",
  audi: "2BC0E4",
  cadillac: "FFFFFF",
};

const TEAM_NAMES: Record<string, string> = {
  mclaren: "McLaren",
  ferrari: "Scuderia Ferrari",
  mercedes: "Mercedes-AMG",
  redbull: "Red Bull Racing",
  astonmartin: "Aston Martin",
  williams: "Williams",
  alpine: "Alpine",
  racingbulls: "RB",
  haas: "Haas",
  audi: "Audi",
  cadillac: "Cadillac",
};

// ─── Ergast circuitId → multiviewer circuit key ───────────────────────────────
const CIRCUIT_KEY_MAP: Record<string, number> = {
  bahrain: 63,
  jeddah: 149,
  albert_park: 1,
  suzuka: 26,
  shanghai: 17,
  miami: 151,
  imola: 21,
  monaco: 6,
  villeneuve: 7,
  catalunya: 4,
  red_bull_ring: 70,
  silverstone: 9,
  hungaroring: 11,
  spa: 12,
  zandvoort: 39,
  monza: 14,
  baku: 73,
  marina_bay: 54,
  americas: 69,
  rodriguez: 15,
  interlagos: 13,
  las_vegas: 80,
  losail: 78,
  yas_marina: 43,
  // extra aliases Ergast sometimes returns
  bahrain_international_circuit: 63,
  yas_island: 43,
  nurburgring: 5,
  portimao: 152,
  mugello: 153,
  istanbul: 32,
};

// ─── Ergast driverId → F1 media photo path (same as driverPhotos.ts) ─────────
const F1_MEDIA_BASE = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";
const DRIVER_PHOTO_PATHS: Record<string, string> = {
  norris:          "L/LANNOR01_Lando_Norris/lannor01",
  max_verstappen:  "M/MAXVER01_Max_Verstappen/maxver01",
  leclerc:         "C/CHALEC01_Charles_Leclerc/chalec01",
  russell:         "G/GEORUS01_George_Russell/georus01",
  hamilton:        "L/LEWHAM01_Lewis_Hamilton/lewham01",
  piastri:         "O/OSCPIA01_Oscar_Piastri/oscpia01",
  antonelli:       "A/ANDANT01_Andrea_Kimi_Antonelli/andant01",
  alonso:          "F/FERALO01_Fernando_Alonso/feralo01",
  sainz:           "C/CARSAI01_Carlos_Sainz/carsai01",
  gasly:           "P/PIEGAS01_Pierre_Gasly/piegas01",
  albon:           "A/ALEALB01_Alexander_Albon/alealb01",
  ocon:            "E/ESTOCO01_Esteban_Ocon/estoco01",
  stroll:          "L/LANSTR01_Lance_Stroll/lanstr01",
  lawson:          "L/LIALAW01_Liam_Lawson/lialaw01",
  hulkenberg:      "N/NICHUL01_Nico_Hulkenberg/nichul01",
  bottas:          "V/VALBOT01_Valtteri_Bottas/valbot01",
  bearman:         "O/OLIBEA01_Oliver_Bearman/olibea01",
  bortoleto:       "G/GABBOR01_Gabriel_Bortoleto/gabbor01",
  hadjar:          "I/ISAHAD01_Isack_Hadjar/isahad01",
  perez:           "S/SERPER01_Sergio_Perez/serper01",
  arvid_lindblad:  "A/ARVLIN01_Arvid_Lindblad/arvlin01",
  colapinto:       "F/FRACOL01_Franco_Colapinto/fracol01",
};

// Ergast driverId → local driverId (for photo lookup)
const ERGAST_TO_LOCAL_DRIVER: Record<string, string> = {
  // Short IDs (older drivers Ergast has had for years)
  norris: "norris",
  leclerc: "leclerc",
  russell: "russell",
  hamilton: "hamilton",
  piastri: "piastri",
  alonso: "alonso",
  sainz: "sainz",
  gasly: "gasly",
  albon: "albon",
  ocon: "ocon",
  stroll: "stroll",
  bottas: "bottas",
  perez: "perez",
  // Full-name IDs Ergast uses for newer / 2026 drivers
  max_verstappen: "max_verstappen",
  verstappen: "max_verstappen",
  andrea_kimi_antonelli: "antonelli",
  antonelli: "antonelli",
  liam_lawson: "lawson",
  lawson: "lawson",
  nico_hulkenberg: "hulkenberg",
  hulkenberg: "hulkenberg",
  oliver_bearman: "bearman",
  bearman: "bearman",
  gabriel_bortoleto: "bortoleto",
  bortoleto: "bortoleto",
  isack_hadjar: "hadjar",
  hadjar: "hadjar",
  arvid_lindblad: "arvid_lindblad",
  lindblad: "arvid_lindblad",
  franco_colapinto: "colapinto",
  colapinto: "colapinto",
  sergio_perez: "perez",
  lance_stroll: "stroll",
  valtteri_bottas: "bottas",
};

function getDriverPhotoUrl(ergastDriverId: string): string | null {
  const localId = ERGAST_TO_LOCAL_DRIVER[ergastDriverId] || ergastDriverId;
  const path = DRIVER_PHOTO_PATHS[localId];
  if (!path) return null;
  return `${F1_MEDIA_BASE}/${path}.png.transform/2col/image.png`;
}

// ─── Country name → ISO 3166-1 alpha-3 ───────────────────────────────────────
const COUNTRY_TO_CODE: Record<string, string> = {
  Australia: "AUS",
  China: "CHN",
  Japan: "JPN",
  Bahrain: "BHR",
  "Saudi Arabia": "KSA",
  "United States": "USA",
  Canada: "CAN",
  Monaco: "MCO",
  Spain: "ESP",
  Austria: "AUT",
  "United Kingdom": "GBR",
  Belgium: "BEL",
  Hungary: "HUN",
  Netherlands: "NLD",
  Italy: "ITA",
  Azerbaijan: "AZE",
  Singapore: "SGP",
  Mexico: "MEX",
  Brazil: "BRA",
  Qatar: "QAT",
  "United Arab Emirates": "ARE",
};

// ─── Nationality → ISO alpha-3 ────────────────────────────────────────────────
const NATIONALITY_TO_CODE: Record<string, string> = {
  British: "GBR",
  Dutch: "NLD",
  Monegasque: "MCO",
  Spanish: "ESP",
  Australian: "AUS",
  Mexican: "MEX",
  Finnish: "FIN",
  German: "DEU",
  French: "FRA",
  Canadian: "CAN",
  Thai: "THA",
  Chinese: "CHN",
  Danish: "DNK",
  Japanese: "JPN",
  Italian: "ITA",
  American: "USA",
  Brazilian: "BRA",
  Argentine: "ARG",
  "New Zealander": "NZL",
};

// ─── Session encoding ─────────────────────────────────────────────────────────
// session_key = round * 10 + sessionIndex
// sessionIndex: 1=FP1, 2=FP2, 3=FP3, 4=Qualifying, 5=Race, 6=Sprint, 7=SprintQualifying

function encodeSessionKey(round: number, idx: number): number {
  return round * 10 + idx;
}

function decodeSessionKey(key: number): { round: number; idx: number } {
  return { round: Math.floor(key / 10), idx: key % 10 };
}

// ─── Public types (UNCHANGED — UI files depend on these shapes) ───────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Jolpica fetch helper ─────────────────────────────────────────────────────

async function jolpicaFetch<T>(path: string): Promise<T> {
  const url = `${JOLPICA}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jolpica API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ─── Internal mappers ─────────────────────────────────────────────────────────

function safeIso(date: string, time?: string | null): string {
  if (!date) return new Date().toISOString();
  const t = time || "12:00:00Z";
  const combined = `${date}T${t}`;
  try {
    return new Date(combined).toISOString();
  } catch {
    return new Date(`${date}T12:00:00Z`).toISOString();
  }
}

function addMinutesIso(iso: string, minutes: number): string {
  try {
    return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
  } catch {
    return iso;
  }
}

function raceToMeeting(race: any): OpenF1Meeting {
  const round = parseInt(race.round, 10);
  const year = parseInt(race.season, 10);
  const circuitId = race.Circuit?.circuitId || "";
  const locality = race.Circuit?.Location?.locality || "";
  const country = race.Circuit?.Location?.country || "";

  // date_start = first available practice session, or race date
  const fp = race.FirstPractice || race.SecondPractice;
  const dateStart = fp
    ? safeIso(fp.date, fp.time)
    : safeIso(race.date, "12:00:00Z");

  // date_end = race date + 3 hours
  const raceStart = safeIso(race.date, race.time || "14:00:00Z");
  const dateEnd = addMinutesIso(raceStart, 180);

  return {
    meeting_key: round,
    meeting_name: race.raceName?.replace(" Grand Prix", "") || race.raceName || "",
    meeting_official_name: race.raceName || "",
    location: locality,
    country_key: round,
    country_code: COUNTRY_TO_CODE[country] || "UNK",
    country_name: country,
    country_flag: null,
    circuit_key: CIRCUIT_KEY_MAP[circuitId] || 0,
    circuit_short_name: locality,
    circuit_type: null,
    circuit_info_url: null,
    circuit_image: null,
    gmt_offset: "+00:00",
    date_start: dateStart,
    date_end: dateEnd,
    year,
  };
}

function raceToSessions(race: any): OpenF1Session[] {
  const round = parseInt(race.round, 10);
  const year = parseInt(race.season, 10);
  const circuitId = race.Circuit?.circuitId || "";
  const locality = race.Circuit?.Location?.locality || "";
  const country = race.Circuit?.Location?.country || "";
  const circuitKey = CIRCUIT_KEY_MAP[circuitId] || 0;
  const countryCode = COUNTRY_TO_CODE[country] || "UNK";

  const base: Omit<OpenF1Session, "session_key" | "session_type" | "session_name" | "date_start" | "date_end"> = {
    meeting_key: round,
    circuit_key: circuitKey,
    circuit_short_name: locality,
    country_key: round,
    country_code: countryCode,
    country_name: country,
    location: locality,
    gmt_offset: "+00:00",
    year,
  };

  const sessions: OpenF1Session[] = [];

  const add = (name: string, type: string, idx: number, date: string, time: string | null | undefined, durationMin: number) => {
    const start = safeIso(date, time || "12:00:00Z");
    const end = addMinutesIso(start, durationMin);
    sessions.push({ ...base, session_key: encodeSessionKey(round, idx), session_name: name, session_type: type, date_start: start, date_end: end });
  };

  if (race.FirstPractice?.date)     add("Practice 1",        "Practice",          1, race.FirstPractice.date,     race.FirstPractice.time,    60);
  if (race.SecondPractice?.date)    add("Practice 2",        "Practice",          2, race.SecondPractice.date,    race.SecondPractice.time,   60);
  if (race.ThirdPractice?.date)     add("Practice 3",        "Practice",          3, race.ThirdPractice.date,     race.ThirdPractice.time,    60);
  const sq = race.SprintQualifying || race.SprintShootout;
  if (sq?.date)                     add("Sprint Qualifying", "Sprint Qualifying", 7, sq.date,                     sq.time,                    45);
  if (race.Sprint?.date)            add("Sprint",            "Sprint",            6, race.Sprint.date,            race.Sprint.time,            35);
  if (race.Qualifying?.date)        add("Qualifying",        "Qualifying",        4, race.Qualifying.date,        race.Qualifying.time,        60);
  // Race always present
  add("Race", "Race", 5, race.date, race.time, 120);

  return sessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
}

// ─── Public fetch functions ───────────────────────────────────────────────────

export async function fetchMeetings(year?: number): Promise<OpenF1Meeting[]> {
  const y = year || new Date().getFullYear();
  const data = await jolpicaFetch<any>(`/${y}.json?limit=50`);
  const races: any[] = data.MRData?.RaceTable?.Races || [];
  return races.map(raceToMeeting);
}

export async function fetchSessions(meetingKey: number): Promise<OpenF1Session[]> {
  const y = new Date().getFullYear();
  const data = await jolpicaFetch<any>(`/${y}/${meetingKey}.json`);
  const race = data.MRData?.RaceTable?.Races?.[0];
  if (!race) return [];
  return raceToSessions(race);
}

export async function fetchDrivers(sessionKey?: number): Promise<OpenF1Driver[]> {
  const y = new Date().getFullYear();
  const [driversData, standingsData] = await Promise.all([
    jolpicaFetch<any>(`/${y}/drivers.json?limit=100`),
    jolpicaFetch<any>(`/current/driverStandings.json`),
  ]);

  const drivers: any[] = driversData.MRData?.DriverTable?.Drivers || [];
  const standings: any[] = standingsData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];

  // Build driverId → {constructorId, teamColor, teamName} map
  const driverConstructorMap: Record<string, { constructorId: string; color: string; name: string }> = {};
  for (const s of standings) {
    const apiTeamId = s.Constructors?.[0]?.constructorId || "";
    const localTeamId = API_TO_LOCAL_TEAM[apiTeamId] || apiTeamId;
    driverConstructorMap[s.Driver.driverId] = {
      constructorId: apiTeamId,
      color: TEAM_COLORS[localTeamId] || "888888",
      name: TEAM_NAMES[localTeamId] || s.Constructors?.[0]?.name || "",
    };
  }

  return drivers.map((d: any): OpenF1Driver => {
    const code = d.code || d.familyName?.substring(0, 3)?.toUpperCase() || "";
    const teamInfo = driverConstructorMap[d.driverId];
    return {
      meeting_key: 0,
      session_key: 0,
      driver_number: parseInt(d.permanentNumber, 10) || 0,
      broadcast_name: d.familyName?.toUpperCase() || "",
      full_name: `${d.givenName} ${d.familyName}`,
      name_acronym: code,
      team_name: teamInfo?.name || "",
      team_colour: teamInfo?.color || "888888",
      first_name: d.givenName || "",
      last_name: d.familyName || "",
      headshot_url: getDriverPhotoUrl(d.driverId),
      country_code: NATIONALITY_TO_CODE[d.nationality || ""] || null,
    };
  });
}

export async function fetchPositions(sessionKey: number): Promise<OpenF1Position[]> {
  const { round, idx } = decodeSessionKey(sessionKey);
  const y = new Date().getFullYear();
  const meetingKey = round;

  if (idx === 5) {
    // Race results
    const data = await jolpicaFetch<any>(`/${y}/${round}/results.json`);
    const results: any[] = data.MRData?.RaceTable?.Races?.[0]?.Results || [];
    const raceDate = data.MRData?.RaceTable?.Races?.[0]?.date || new Date().toISOString();
    return results.map((r: any): OpenF1Position => ({
      date: safeIso(raceDate),
      session_key: sessionKey,
      meeting_key: meetingKey,
      driver_number: parseInt(r.number, 10) || 0,
      position: parseInt(r.position, 10) || 0,
    }));
  }

  if (idx === 4) {
    // Qualifying results
    const data = await jolpicaFetch<any>(`/${y}/${round}/qualifying.json`);
    const results: any[] = data.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
    const raceDate = data.MRData?.RaceTable?.Races?.[0]?.date || new Date().toISOString();
    return results.map((r: any): OpenF1Position => ({
      date: safeIso(raceDate),
      session_key: sessionKey,
      meeting_key: meetingKey,
      driver_number: parseInt(r.number, 10) || 0,
      position: parseInt(r.position, 10) || 0,
    }));
  }

  // Practice sessions — no position data in Ergast
  return [];
}

export async function fetchRaceControl(sessionKey: number | "latest"): Promise<OpenF1RaceControl[]> {
  // Not available in Ergast. Live race control comes from the SignalR feed.
  return [];
}

export async function fetchStints(sessionKey: number): Promise<OpenF1Stint[]> {
  // Not available in Ergast.
  return [];
}

export async function fetchLaps(sessionKey: number, driverNumber?: number): Promise<OpenF1Lap[]> {
  // Not available in Ergast (paginated per-lap data is impractical).
  return [];
}

export async function fetchCircuitData(circuitKey: number, year: number): Promise<CircuitData | null> {
  // Try requested year first, then fall back to previous years.
  // Circuit layouts rarely change so 2025/2024 data is valid for 2026.
  const yearsToTry = [year, year - 1, year - 2];
  for (const y of yearsToTry) {
    try {
      const url = `${MULTIVIEWER_CIRCUITS}/${circuitKey}/${y}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.x && data?.y) {
        return {
          x: data.x,
          y: data.y,
          circuitKey: data.circuitKey,
          circuitName: data.circuitName || "",
          rotation: data.rotation || 0,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Utility functions (ALL UNCHANGED — UI imports these directly) ─────────────

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

export function getSessionStatus(session: { date_start: string; date_end: string }): "live" | "completed" | "upcoming" {
  const now = new Date();
  const start = new Date(session.date_start);
  const end = new Date(session.date_end);
  if (now >= start && now <= end) return "live";
  if (now > end) return "completed";
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
    case "Race":               return "flag";
    case "Qualifying":         return "timer-outline";
    case "Sprint":             return "flash-outline";
    case "Sprint Qualifying":  return "flash-outline";
    case "Sprint Shootout":    return "flash-outline";
    default:                   return "speedometer-outline";
  }
}

export function getRaceControlIcon(category: string, flag?: string | null): { icon: string; color: string } {
  if (category === "Flag") {
    switch (flag) {
      case "GREEN":          return { icon: "flag",                  color: "#00D26A" };
      case "YELLOW":         return { icon: "warning",               color: "#FFD700" };
      case "DOUBLE YELLOW":  return { icon: "warning",               color: "#FF8C00" };
      case "RED":            return { icon: "stop-circle",           color: "#E10600" };
      case "CHEQUERED":      return { icon: "checkmark-done-circle", color: "#FFFFFF" };
      case "BLUE":           return { icon: "flag",                  color: "#0066FF" };
      case "BLACK AND WHITE":return { icon: "flag",                  color: "#888"    };
      case "CLEAR":          return { icon: "flag",                  color: "#00D26A" };
      default:               return { icon: "flag",                  color: "#FFD700" };
    }
  }
  if (category === "SafetyCar") return { icon: "car-sport", color: "#FF8C00" };
  if (category === "Drs")       return { icon: "flash",     color: "#00D26A" };
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
