/**
 * liveTimingProvider.ts
 *
 * Real-time F1 timing using the OFFICIAL F1 SignalR live timing feed:
 *   wss://livetiming.formula1.com/signalr  (no auth required, public hub)
 *
 * Protocol flow:
 *  1. GET /signalr/negotiate  -> ConnectionToken + Set-Cookie
 *  2. WebSocket connect with token + cookie + required headers
 *  3. Send Subscribe message for all streams
 *  4. Receive push updates, deep-merge into state, emit snapshots
 *
 * On web platform (browsers can't set WS headers):
 *  -> Falls back to polling multiviewer.app which proxies the same feed
 *
 * For map positions:
 *  -> Position.z stream is zlib-compressed; multiviewer decodes it server-side
 *  -> We poll multiviewer separately just for decoded positions
 *
 * No fake data is ever produced. If the feed is unreachable the snapshot is null.
 */

import { fetch } from "expo/fetch";
import { Platform } from "react-native";

// ─── Endpoints ──────────────────────────────────────────────────────────────
const F1_NEGOTIATE =
  "https://livetiming.formula1.com/signalr/negotiate" +
  "?connectionData=%5B%7B%22name%22%3A%22Streaming%22%7D%5D" +
  "&clientProtocol=1.5";

const F1_WS_BASE = "wss://livetiming.formula1.com/signalr/connect";
const F1_CONN_DATA = encodeURIComponent(JSON.stringify([{ name: "Streaming" }]));

// Multiviewer: used on web as full fallback, and always for decoded positions
const MULTIVIEWER_STATE = "https://api.multiviewer.app/api/v1/live-timing/state";

// ─── Streams (all non-compressed text streams) ───────────────────────────────
const STREAMS = [
  "Heartbeat",
  "TimingData",
  "TimingAppData",
  "TrackStatus",
  "RaceControlMessages",
  "SessionInfo",
  "SessionData",
  "LapCount",
  "DriverList",
  "ExtrapolatedClock",
] as const;

// ─── Public types (unchanged interface — live.tsx depends on these) ──────────

export type SessionStatus =
  | "Inactive"
  | "Started"
  | "AbortedStart"
  | "Finished"
  | "Finalised"
  | "Ends"
  | "Unknown";

export interface LiveDriverTiming {
  driverNumber: number;
  position: number;
  gapToAhead: string | null;
  gapToLeader: string | null;
  lapTime: string | null;
  lastLapTime: string | null;
  sector1: string | null;
  sector2: string | null;
  sector3: string | null;
  inPit: boolean;
  pitOut: boolean;
  stopped: boolean;
  lapNumber: number;
  compound: string | null;
  tyreAge: number | null;
  pitStops: number;
  drsActive: boolean;
}

export interface LiveRaceControlMessage {
  utc: string;
  lap: number | null;
  category: string;
  message: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driverNumber: string | null;
  status: string | null;
}

export interface LiveTrackStatus {
  status: string;
  message: string;
}

export interface LiveTimingSnapshot {
  sessionStatus: SessionStatus;
  sessionName: string | null;
  sessionType: string | null;
  trackStatus: LiveTrackStatus | null;
  drivers: LiveDriverTiming[];
  raceControlMessages: LiveRaceControlMessage[];
  lapCount: { current: number; total: number } | null;
  timestamp: number;
}

export interface LiveDriverPosition {
  driverNumber: number;
  x: number;
  y: number;
  z: number;
  status: string;
  timestamp: string;
}

// ─── Internal raw-state types ────────────────────────────────────────────────

interface RawState {
  TimingData?: any;
  TimingAppData?: any;
  TrackStatus?: any;
  RaceControlMessages?: any;
  SessionInfo?: any;
  SessionData?: any;
  LapCount?: any;
  DriverList?: any;
  ExtrapolatedClock?: any;
  [key: string]: any;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Deep merge two objects.
 * The F1 feed sends sparse incremental updates that must be merged into state.
 * Rules:
 *  - Both objects: recurse
 *  - Source null/undefined: keep existing value
 *  - Otherwise: replace with source value
 */
function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (typeof source !== "object" || Array.isArray(source)) return source;
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    return { ...source };
  }
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = result[key];
    if (
      sv !== null &&
      sv !== undefined &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv !== null &&
      tv !== undefined &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

/**
 * Convert a sparse-object representation of an array (e.g. {"0":a,"1":b})
 * into a proper array. Also handles actual arrays passthrough.
 */
function sparseToArray<T>(obj: Record<string, T> | T[] | null | undefined): T[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  const keys = Object.keys(obj)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n));
  if (keys.length === 0) return [];
  const maxIdx = Math.max(...keys);
  const result: T[] = [];
  for (let i = 0; i <= maxIdx; i++) {
    const v = (obj as Record<string, T>)[String(i)];
    if (v !== undefined) result.push(v);
  }
  return result;
}

function parseSessionStatus(rawState: RawState): SessionStatus {
  // Try SessionData.StatusSeries (array or sparse object) — latest entry
  const statusSeries = rawState.SessionData?.StatusSeries;
  if (statusSeries) {
    const arr = sparseToArray<any>(statusSeries);
    for (let i = arr.length - 1; i >= 0; i--) {
      const s = arr[i]?.SessionStatus;
      if (s) {
        const valid: SessionStatus[] = [
          "Inactive", "Started", "AbortedStart", "Finished", "Finalised", "Ends",
        ];
        if (valid.includes(s)) return s as SessionStatus;
      }
    }
  }
  // Fallback: SessionInfo.Status
  const infoStatus = rawState.SessionInfo?.Status;
  if (infoStatus) {
    const valid: SessionStatus[] = [
      "Inactive", "Started", "AbortedStart", "Finished", "Finalised", "Ends",
    ];
    if (valid.includes(infoStatus)) return infoStatus as SessionStatus;
  }
  return "Unknown";
}

function parseDriverLine(
  driverNum: string,
  line: any,
  appLine: any,
  _driverInfo: any
): LiveDriverTiming {
  const stintsRaw = appLine?.Stints;
  const stints = sparseToArray<any>(stintsRaw);
  const latestStint = stints.length > 0 ? stints[stints.length - 1] : null;

  const sectors = line?.Sectors || {};
  const s1 = sectors["0"]?.Value ?? null;
  const s2 = sectors["1"]?.Value ?? null;
  const s3 = sectors["2"]?.Value ?? null;

  // Gap to ahead: IntervalToPositionAhead.Value
  let gapToAhead: string | null = null;
  const interval = line?.IntervalToPositionAhead;
  if (interval) {
    gapToAhead =
      typeof interval === "object" ? interval.Value ?? null : String(interval);
  }

  // Gap to leader
  let gapToLeader: string | null = null;
  const gtl = line?.GapToLeader;
  if (gtl != null && gtl !== "") {
    gapToLeader = typeof gtl === "object" ? gtl.Value ?? null : String(gtl);
  }

  // Last lap time
  let lastLapTime: string | null = null;
  const llt = line?.LastLapTime;
  if (llt) {
    lastLapTime = typeof llt === "object" ? llt.Value ?? null : String(llt);
  }

  // Best lap time
  let lapTime: string | null = null;
  const blt = line?.BestLapTime;
  if (blt) {
    lapTime = typeof blt === "object" ? blt.Value ?? null : String(blt);
  }

  const position =
    parseInt(String(line?.Line ?? line?.Position ?? "0"), 10) || 0;

  return {
    driverNumber: parseInt(driverNum, 10) || 0,
    position,
    gapToAhead,
    gapToLeader,
    lapTime,
    lastLapTime,
    sector1: s1,
    sector2: s2,
    sector3: s3,
    inPit: !!(line?.InPit),
    pitOut: !!(line?.PitOut),
    stopped: !!(line?.Stopped),
    lapNumber: parseInt(String(line?.NumberOfLaps ?? "0"), 10) || 0,
    compound: latestStint?.Compound ?? null,
    tyreAge: latestStint?.TotalLaps ?? null,
    pitStops: parseInt(String(line?.NumberOfPitStops ?? "0"), 10) || 0,
    drsActive: false, // CarData.z is compressed; skip DRS without pako
  };
}

function buildDrivers(rawState: RawState): LiveDriverTiming[] {
  const lines: Record<string, any> = rawState.TimingData?.Lines || {};
  const appLines: Record<string, any> = rawState.TimingAppData?.Lines || {};
  const driverList: Record<string, any> = rawState.DriverList || {};

  const result: LiveDriverTiming[] = [];
  for (const num of Object.keys(lines)) {
    result.push(parseDriverLine(num, lines[num], appLines[num] || {}, driverList[num] || {}));
  }

  return result.sort((a, b) => {
    if (a.position === 0 && b.position !== 0) return 1;
    if (b.position === 0 && a.position !== 0) return -1;
    return a.position - b.position;
  });
}

function buildRCMessages(rawState: RawState): LiveRaceControlMessage[] {
  const msgs = rawState.RaceControlMessages?.Messages;
  if (!msgs) return [];
  const arr = sparseToArray<any>(msgs);
  return arr
    .filter((m: any) => m && m.Utc)
    .map((m: any) => ({
      utc: m.Utc || "",
      lap: m.Lap != null ? parseInt(String(m.Lap), 10) : null,
      category: m.Category || "",
      message: m.Message || "",
      flag: m.Flag ?? null,
      scope: m.Scope ?? null,
      sector: m.Sector != null ? parseInt(String(m.Sector), 10) : null,
      driverNumber: m.RacingNumber ?? null,
      status: m.Status ?? null,
    }))
    .sort((a, b) => new Date(b.utc).getTime() - new Date(a.utc).getTime());
}

function buildSnapshot(rawState: RawState): LiveTimingSnapshot {
  return {
    sessionStatus: parseSessionStatus(rawState),
    sessionName: rawState.SessionInfo?.Name ?? null,
    sessionType: rawState.SessionInfo?.Type ?? null,
    trackStatus: rawState.TrackStatus
      ? {
          status: String(rawState.TrackStatus.Status ?? ""),
          message: String(rawState.TrackStatus.Message ?? ""),
        }
      : null,
    drivers: buildDrivers(rawState),
    raceControlMessages: buildRCMessages(rawState),
    lapCount:
      rawState.LapCount?.CurrentLap != null
        ? {
            current: parseInt(String(rawState.LapCount.CurrentLap), 10) || 0,
            total: parseInt(String(rawState.LapCount.TotalLaps ?? "0"), 10) || 0,
          }
        : null,
    timestamp: Date.now(),
  };
}

// ─── Multiviewer fallback parsers (web platform + position data) ─────────────

function parseMultiviewerSnapshot(raw: any): LiveTimingSnapshot | null {
  if (!raw || typeof raw !== "object") return null;

  // Session status from multiviewer
  const sessionStatus = ((): SessionStatus => {
    const s = raw?.SessionStatus?.Status || raw?.SessionInfo?.Status || "Unknown";
    const valid: SessionStatus[] = [
      "Inactive", "Started", "AbortedStart", "Finished", "Finalised", "Ends",
    ];
    return valid.includes(s) ? (s as SessionStatus) : "Unknown";
  })();

  const timingData = raw.TimingData;
  const appData = raw.TimingAppData;
  const rcRaw = raw.RaceControlMessages;

  // Build drivers from multiviewer TimingData
  const driverLines: Record<string, any> = timingData?.Lines || {};
  const appLines: Record<string, any> = appData?.Lines || {};
  const drivers: LiveDriverTiming[] = [];

  for (const [num, line] of Object.entries(driverLines) as [string, any][]) {
    drivers.push(parseDriverLine(num, line, appLines[num] || {}, {}));
  }
  drivers.sort((a, b) => {
    if (a.position === 0 && b.position !== 0) return 1;
    if (b.position === 0 && a.position !== 0) return -1;
    return a.position - b.position;
  });

  // RC messages from multiviewer
  const rcMessages: LiveRaceControlMessage[] = [];
  const rcMsgs = rcRaw?.Messages;
  if (rcMsgs) {
    const arr = Array.isArray(rcMsgs) ? rcMsgs : Object.values(rcMsgs);
    arr
      .filter((m: any) => m && m.Utc)
      .forEach((m: any) => {
        rcMessages.push({
          utc: m.Utc || "",
          lap: m.Lap != null ? parseInt(String(m.Lap), 10) : null,
          category: m.Category || "",
          message: m.Message || "",
          flag: m.Flag ?? null,
          scope: m.Scope ?? null,
          sector: m.Sector != null ? parseInt(String(m.Sector), 10) : null,
          driverNumber: m.RacingNumber ?? null,
          status: m.Status ?? null,
        });
      });
    rcMessages.sort((a, b) => new Date(b.utc).getTime() - new Date(a.utc).getTime());
  }

  const lapCountRaw = raw.LapCount;

  return {
    sessionStatus,
    sessionName: raw.SessionInfo?.Name ?? null,
    sessionType: raw.SessionInfo?.Type ?? null,
    trackStatus: raw.TrackStatus
      ? { status: String(raw.TrackStatus.Status ?? ""), message: String(raw.TrackStatus.Message ?? "") }
      : null,
    drivers,
    raceControlMessages: rcMessages,
    lapCount:
      lapCountRaw?.CurrentLap != null
        ? { current: parseInt(String(lapCountRaw.CurrentLap), 10) || 0, total: parseInt(String(lapCountRaw.TotalLaps ?? "0"), 10) || 0 }
        : null,
    timestamp: Date.now(),
  };
}

// ─── Position fetch (multiviewer, handles Position.z decompression) ──────────

export async function fetchLiveDriverPositions(): Promise<LiveDriverPosition[]> {
  try {
    const res = await fetch(MULTIVIEWER_STATE, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const raw = await res.json();
    if (!raw?.Position?.Position) return [];

    const entries = raw.Position.Position as any[];
    if (!entries || entries.length === 0) return [];

    const latest = entries[entries.length - 1];
    if (!latest?.Entries) return [];

    const positions: LiveDriverPosition[] = [];
    for (const [numStr, entry] of Object.entries(latest.Entries as Record<string, any>)) {
      const driverNumber = parseInt(numStr, 10);
      if (isNaN(driverNumber)) continue;
      positions.push({
        driverNumber,
        x: entry.X ?? 0,
        y: entry.Y ?? 0,
        z: entry.Z ?? 0,
        status: entry.Status ?? "",
        timestamp: latest.Timestamp ?? "",
      });
    }
    return positions;
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isSessionLive(snapshot: LiveTimingSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.sessionStatus === "Started" || snapshot.sessionStatus === "AbortedStart";
}

export function isSessionEnded(snapshot: LiveTimingSnapshot | null): boolean {
  if (!snapshot) return false;
  const s = snapshot.sessionStatus;
  return s === "Finished" || s === "Finalised" || s === "Ends";
}

// ─── F1LiveTimingClient ───────────────────────────────────────────────────────
// Connects to the official F1 SignalR endpoint on native.
// Falls back to multiviewer polling on web.

type UpdateCallback = (snap: LiveTimingSnapshot) => void;
type ConnectionCallback = (connected: boolean) => void;

export class F1LiveTimingClient {
  private ws: WebSocket | null = null;
  private rawState: RawState = {};
  private updateCbs: UpdateCallback[] = [];
  private connCbs: ConnectionCallback[] = [];
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  // ── Event subscriptions ────────────────────────────────────────────────────
  onUpdate(cb: UpdateCallback): () => void {
    this.updateCbs.push(cb);
    return () => { this.updateCbs = this.updateCbs.filter((c) => c !== cb); };
  }

  onConnectionChange(cb: ConnectionCallback): () => void {
    this.connCbs.push(cb);
    return () => { this.connCbs = this.connCbs.filter((c) => c !== cb); };
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    if (this.destroyed) return;
    if (Platform.OS === "web") {
      // Browsers cannot set WebSocket headers — use multiviewer polling
      this.startWebPolling();
    } else {
      await this.connectSignalR();
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  disconnect(): void {
    this.destroyed = true;
    this.clearTimers();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  // ── SignalR: negotiate ────────────────────────────────────────────────────
  private async negotiate(): Promise<{ token: string; cookie: string }> {
    const res = await fetch(F1_NEGOTIATE);
    if (!res.ok) throw new Error(`negotiate failed: ${res.status}`);
    const data = await res.json();
    const token: string = data.ConnectionToken;
    if (!token) throw new Error("no ConnectionToken in negotiate response");

    // Grab the session cookie
    const rawCookie =
      res.headers.get("set-cookie") ||
      res.headers.get("Set-Cookie") ||
      "";
    // Keep only the first name=value pair (strip path, expires, etc.)
    const cookie = rawCookie.split(";")[0].trim();

    return { token, cookie };
  }

  // ── SignalR: connect WebSocket ────────────────────────────────────────────
  private async connectSignalR(): Promise<void> {
    if (this.destroyed) return;
    try {
      const { token, cookie } = await this.negotiate();
      const url =
        `${F1_WS_BASE}?clientProtocol=1.5&transport=webSockets` +
        `&connectionToken=${encodeURIComponent(token)}` +
        `&connectionData=${F1_CONN_DATA}`;

      // React Native WebSocket supports custom headers via the third argument
      // Cast to any to satisfy TypeScript (RN-specific extension)
      this.ws = new WebSocket(url, [], {
        headers: {
          "User-Agent": "BestHTTP",
          "Accept-Encoding": "gzip,identity",
          ...(cookie ? { Cookie: cookie } : {}),
        },
      } as any);

      this.ws.onopen = () => {
        if (this.destroyed) { this.ws?.close(); return; }
        this.reconnectAttempts = 0;
        this.sendSubscribe();
        this.setConnected(true);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.setConnected(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will follow and trigger reconnect
        console.warn("[F1SignalR] WebSocket error — reconnecting");
      };
    } catch (err) {
      console.warn("[F1SignalR] connectSignalR failed:", err);
      this.scheduleReconnect();
    }
  }

  // ── SignalR: subscribe ────────────────────────────────────────────────────
  private sendSubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        H: "Streaming",
        M: "Subscribe",
        A: [Array.from(STREAMS)],
        I: 1,
      })
    );
  }

  // ── SignalR: message handler ──────────────────────────────────────────────
  private handleMessage(raw: string): void {
    try {
      if (!raw || raw === "{}") return; // server keepalive ping

      const msg = JSON.parse(raw);

      // R = initial full state (response to Subscribe)
      if (msg.R && typeof msg.R === "object") {
        for (const [stream, data] of Object.entries(msg.R)) {
          this.rawState[stream] = data;
        }
        this.emitSnapshot();
      }

      // M = array of incremental feed messages
      if (Array.isArray(msg.M)) {
        let changed = false;
        for (const item of msg.M) {
          if (
            item?.H?.toLowerCase() === "streaming" &&
            item?.M === "feed" &&
            Array.isArray(item.A) &&
            item.A.length >= 2
          ) {
            const [streamName, data] = item.A;
            if (streamName && data !== undefined && data !== null) {
              this.rawState[streamName] = deepMerge(
                this.rawState[streamName] ?? {},
                data
              );
              changed = true;
            }
          }
        }
        if (changed) this.emitSnapshot();
      }
    } catch (err) {
      console.warn("[F1SignalR] parse error:", err);
    }
  }

  // ── Emit snapshot to listeners ────────────────────────────────────────────
  private emitSnapshot(): void {
    if (this.destroyed) return;
    const snap = buildSnapshot(this.rawState);
    this.updateCbs.forEach((cb) => cb(snap));
  }

  // ── Reconnect with exponential backoff ───────────────────────────────────
  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const maxAttempts = 20;
    if (this.reconnectAttempts >= maxAttempts) {
      console.warn("[F1SignalR] max reconnect attempts reached");
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) this.connectSignalR();
    }, delay);
  }

  // ── Web fallback: poll multiviewer ────────────────────────────────────────
  private async startWebPolling(): Promise<void> {
    if (this.destroyed) return;
    try {
      const res = await fetch(MULTIVIEWER_STATE, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const raw = await res.json();
      const snap = parseMultiviewerSnapshot(raw);
      if (snap) {
        this.updateCbs.forEach((cb) => cb(snap));
        this.setConnected(true);
      } else {
        this.setConnected(false);
      }
    } catch (err) {
      console.warn("[F1LiveTiming] web poll failed:", err);
      this.setConnected(false);
    }
    if (!this.destroyed) {
      this.pollTimer = setTimeout(() => this.startWebPolling(), 2_000);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private setConnected(val: boolean): void {
    if (this.connected !== val) {
      this.connected = val;
      this.connCbs.forEach((cb) => cb(val));
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
  }
}
