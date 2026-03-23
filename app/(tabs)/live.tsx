/**
 * live.tsx — Live Timing & Race Hub
 *
 * Data sources:
 *  LIVE SESSION  → F1 SignalR feed via useLiveTiming()
 *  SESSION ENDED → frozen last live standings shown as final results
 *  HISTORICAL    → Ergast via useOpenF1Positions (race/qualifying results)
 *  PHOTOS        → driverPhotos.ts (F1 CDN, no API call needed)
 *  CIRCUIT MAP   → multiviewer.app circuits API via useOpenF1CircuitPath
 */

import React, { useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions, Image, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  Layout, FadeInDown,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { getTeam, getDriver, DRIVERS } from "@/constants/f1Data";
import { getDriverPhoto } from "@/constants/driverPhotos";
import {
  useOpenF1Meetings, useOpenF1Sessions, useOpenF1Positions,
  useOpenF1RaceControl, useOpenF1CircuitPath,
} from "@/hooks/useOpenF1";
import {
  getRaceControlIcon, getMeetingStatus, getSessionStatus,
  getCountryFlag, DRIVER_NUMBER_TO_ID,
  OpenF1RaceControl, OpenF1Meeting, OpenF1Session,
} from "@/services/openf1";
import { useLiveTiming, getLiveRCIcon, trackStatusToFlag } from "@/hooks/useLiveTiming";
import { LiveRaceControlMessage } from "@/services/liveTimingProvider";
import { useTranslation } from "@/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = 240;

const TEAM_LOGO_URLS: Record<string, string> = {
  mclaren:      "https://media.formula1.com/content/dam/fom-website/teams/2024/mclaren-logo.png",
  ferrari:      "https://media.formula1.com/content/dam/fom-website/teams/2024/ferrari-logo.png",
  mercedes:     "https://media.formula1.com/content/dam/fom-website/teams/2024/mercedes-logo.png",
  redbull:      "https://media.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing-logo.png",
  astonmartin:  "https://media.formula1.com/content/dam/fom-website/teams/2024/aston-martin-logo.png",
  williams:     "https://media.formula1.com/content/dam/fom-website/teams/2024/williams-logo.png",
  alpine:       "https://media.formula1.com/content/dam/fom-website/teams/2024/alpine-logo.png",
  racingbulls:  "https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png",
  haas:         "https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png",
  audi:         "https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png",
  cadillac:     "https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png",
};

const TYRE_COLORS: Record<string, string> = {
  SOFT: "#FF3333", MEDIUM: "#FFEE00", HARD: "#FFFFFF",
  INTERMEDIATE: "#33CC44", WET: "#3399FF",
  S: "#FF3333", M: "#FFEE00", H: "#FFFFFF", I: "#33CC44", W: "#3399FF",
};
const TYRE_BG: Record<string, string> = {
  SOFT: "#FF333322", MEDIUM: "#FFEE0022", HARD: "#FFFFFF22",
  INTERMEDIATE: "#33CC4422", WET: "#3399FF22",
  S: "#FF333322", M: "#FFEE0022", H: "#FFFFFF22", I: "#33CC4422", W: "#3399FF22",
};
const TYRE_SHORT: Record<string, string> = {
  SOFT:"S", MEDIUM:"M", HARD:"H", INTERMEDIATE:"I", WET:"W",
  S:"S", M:"M", H:"H", I:"I", W:"W",
};

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function parseSvgPath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const nums = d.match(/-?[\d.]+/g);
  if (!nums) return points;
  for (let i = 0; i < nums.length - 1; i += 2)
    points.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
  return points;
}

function interpolateOnPath(pts: { x: number; y: number }[], frac: number) {
  if (pts.length === 0) return { x: 50, y: 50 };
  const idx = frac * (pts.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, pts.length - 1);
  const t = idx - lo;
  return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * t, y: pts[lo].y + (pts[hi].y - pts[lo].y) * t };
}

function formatLapTime(s: number | null): string {
  if (!s) return "--:--.---";
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(3).padStart(6, "0")}`;
}

// ─── LivePulse ────────────────────────────────────────────────────────────────

function LivePulse() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.2, { duration: 500 }), withTiming(1, { duration: 500 })), -1
    );
  }, []);
  return <Animated.View style={[styles.liveDot, useAnimatedStyle(() => ({ opacity: opacity.value }))]} />;
}

// ─── Circuit map ──────────────────────────────────────────────────────────────

interface MapMarker { driverNumber: number; position: number; cx?: number; cy?: number; }

function CircuitMap({ markers, trackPath, circuitName, circuitInfo, isLiveCoords }: {
  markers: MapMarker[]; trackPath: string; circuitName: string;
  circuitInfo: string; isLiveCoords: boolean;
}) {
  const pts = useMemo(() => parseSvgPath(trackPath), [trackPath]);
  if (pts.length === 0) return (
    <View style={styles.mapContainer}>
      <View style={styles.mapInfo}>
        <Text style={styles.mapCircuitName}>{circuitName}</Text>
        <Text style={styles.mapCircuitStats}>{circuitInfo}</Text>
      </View>
    </View>
  );

  const pad = 20;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const vbW = Math.max(...xs) + pad - minX, vbH = Math.max(...ys) + pad - minY;
  const r = Math.max(4, vbW * 0.014);

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapInfo}>
        <Text style={styles.mapCircuitName}>{circuitName}</Text>
        <Text style={styles.mapCircuitStats}>{circuitInfo}</Text>
        {!isLiveCoords && (
          <Text style={styles.mapNote}>Position order · live coords unavailable</Text>
        )}
      </View>
      <View style={styles.mapSvgWrap}>
        <Svg width="100%" height={MAP_HEIGHT} viewBox={`${minX} ${minY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet">
          <Path d={trackPath} stroke="#2A2A2A" strokeWidth={Math.max(8, vbW * 0.015)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={trackPath} stroke="#3A3A3A" strokeWidth={Math.max(5, vbW * 0.01)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={trackPath} stroke="#555" strokeWidth={Math.max(1, vbW * 0.002)} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
          {markers.slice(0, 10).map((d) => {
            const driverId = DRIVER_NUMBER_TO_ID[d.driverNumber];
            const driver = driverId ? getDriver(driverId) : null;
            const team = driver ? getTeam(driver.teamId) : null;
            const color = team?.color || "#888";
            const pos = (d.cx !== undefined && d.cy !== undefined)
              ? { x: d.cx, y: d.cy }
              : interpolateOnPath(pts, (d.position - 1) / Math.max(markers.slice(0,10).length - 1, 1));
            return (
              <G key={d.driverNumber}>
                <Circle cx={pos.x} cy={pos.y} r={r * 1.3} fill={color} opacity={0.3} />
                <Circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity={0.95} />
                <Circle cx={pos.x} cy={pos.y} r={r * 0.75} fill={d.position === 1 ? "#fff" : color} opacity={0.95} />
                <SvgText x={pos.x} y={pos.y + r * 0.42} textAnchor="middle" fontSize={r * 0.65} fontWeight="bold" fill={d.position === 1 ? "#000" : "#fff"}>
                  {d.position}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

// ─── LapProgress ──────────────────────────────────────────────────────────────

function LapProgress({ lap, total }: { lap: number; total: number }) {
  const pct = total > 0 ? lap / total : 0;
  return (
    <View style={styles.lapBarWrap}>
      <View style={styles.lapBarTrack}>
        <View style={[styles.lapBarFill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={styles.lapBarText}>LAP {lap} / {total}</Text>
    </View>
  );
}

// ─── Unified timing row ───────────────────────────────────────────────────────

interface TimingRow {
  driverNumber: number;
  driverId: string;
  position: number;
  compound: string;
  tyreLaps: number;
  lapDisplay: string;
  gap: string | null;
  inPit: boolean;
  pitOut: boolean;
  drsActive: boolean;
  source: "live" | "final" | "historical";
}

function DriverTimingRow({ data }: { data: TimingRow }) {
  const driver = getDriver(data.driverId);
  const team = getTeam(driver?.teamId || "");
  const compound = data.compound || "M";
  const tyreShort = TYRE_SHORT[compound] || compound.charAt(0);
  const logoUrl = team ? TEAM_LOGO_URLS[team.id] : undefined;
  const photo = getDriverPhoto(data.driverId);

  return (
    <Animated.View
      layout={Layout.springify().damping(18).stiffness(160)}
      entering={FadeInDown.duration(200)}
      style={[styles.timingRow, (data.inPit || data.pitOut) && styles.timingRowPit]}
    >
      <View style={styles.timingPos}>
        <Text style={[styles.timingPosNum, data.position === 1 && { color: "#FFD700" }]}>
          {data.source === "final" ? `P${data.position}` : data.position}
        </Text>
      </View>
      {photo ? (
        <Image source={photo} style={styles.timingPhoto} />
      ) : (
        <View style={[styles.timingPhotoPlaceholder, { backgroundColor: (team?.color || "#555") + "33" }]}>
          <Text style={[styles.timingPhotoNum, { color: team?.color }]}>{driver?.number || data.driverNumber}</Text>
        </View>
      )}
      <View style={[styles.timingBar, { backgroundColor: team?.color || "#555" }]} />
      <View style={styles.timingInfo}>
        <Text style={styles.timingShort}>{driver?.shortName || `#${data.driverNumber}`}</Text>
        <View style={styles.timingTeamRow}>
          {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.teamLogoSmall} resizeMode="contain" /> : null}
          <Text style={styles.timingTeam}>{team?.shortName || ""}</Text>
        </View>
      </View>
      {data.source !== "historical" && (
        <View style={[styles.tyreBadge, { backgroundColor: TYRE_BG[compound] || "#FFFFFF22" }]}>
          <Text style={[styles.tyreText, { color: TYRE_COLORS[compound] || "#fff" }]}>{tyreShort}</Text>
          {data.tyreLaps > 0 && <Text style={styles.tyreLaps}>{data.tyreLaps}</Text>}
        </View>
      )}
      {data.drsActive && <View style={styles.drsBadge}><Text style={styles.drsText}>DRS</Text></View>}
      <View style={styles.timingRight}>
        {data.inPit ? (
          <Text style={styles.timingPit}>IN PIT</Text>
        ) : data.pitOut ? (
          <Text style={styles.timingPit}>PIT OUT</Text>
        ) : data.gap && data.gap !== "" ? (
          <Text style={styles.timingGap}>{data.gap}</Text>
        ) : (
          <Text style={styles.timingLap}>{data.lapDisplay}</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Race Control feed ────────────────────────────────────────────────────────

function RaceControlFeed({ liveMessages, historicalMessages, isLive }: {
  liveMessages: LiveRaceControlMessage[];
  historicalMessages: OpenF1RaceControl[] | undefined;
  isLive: boolean;
}) {
  const items = isLive ? liveMessages : (historicalMessages || []);
  if (items.length === 0) return null;
  return (
    <View style={styles.feedSection}>
      <Text style={styles.feedTitle}>RACE CONTROL{isLive ? " · LIVE" : ""}</Text>
      {items.slice(0, 20).map((msg: any, idx: number) => {
        const isLiveMsg = isLive;
        const { icon, color } = isLiveMsg
          ? getLiveRCIcon(msg.category, msg.flag)
          : getRaceControlIcon(msg.category, msg.flag);
        const dateStr = isLiveMsg ? msg.utc : msg.date;
        const timeStr = new Date(dateStr).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
        const message = isLiveMsg ? msg.message : msg.message;
        const lap = isLiveMsg ? msg.lap : msg.lap_number;
        const flag = msg.flag;
        return (
          <View key={`${dateStr}-${idx}`} style={styles.feedRow}>
            <View style={[styles.feedIcon, { backgroundColor: color + "22" }]}>
              <Ionicons name={icon as any} size={12} color={color} />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedMessage} numberOfLines={2}>{message}</Text>
              <View style={styles.feedMeta}>
                <Text style={styles.feedTime}>{timeStr}</Text>
                {lap != null && lap > 0 && <Text style={styles.feedLap}>LAP {lap}</Text>}
                {!!flag && (
                  <View style={[styles.feedFlagBadge, { backgroundColor: color + "22" }]}>
                    <Text style={[styles.feedFlagText, { color }]}>{flag}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function sessionAbbr(name: string): string {
  const map: Record<string, string> = {
    "Practice 1":"FP1","Practice 2":"FP2","Practice 3":"FP3",
    "Qualifying":"Q","Sprint Qualifying":"SQ","Sprint Shootout":"SQ",
    "Sprint":"Sprint","Race":"Race",
  };
  return map[name] || name;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ sessionKey?: string; meetingKey?: string }>();
  const [activeView, setActiveView] = React.useState<"timing" | "updates">("timing");
  const [manualSessionKey, setManualSessionKey] = React.useState<number | undefined>(undefined);
  const [now, setNow] = React.useState(() => new Date());
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  // Frozen last-known live data when session ends
  const frozenDriversRef = useRef<any[]>([]);
  const frozenLapCountRef = useRef<{current:number;total:number}|null>(null);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Meetings & sessions (calendar layer) ─────────────────────────────────
  const { data: meetings, isLoading: meetingsLoading } = useOpenF1Meetings();

  const activeMeeting: OpenF1Meeting | undefined = useMemo(() => {
    if (!meetings) return undefined;
    if (params.meetingKey) {
      const found = meetings.find(m => m.meeting_key === Number(params.meetingKey));
      if (found) return found;
    }
    const live = meetings.find(m => getMeetingStatus(m) === "live");
    if (live) return live;
    const past = meetings.filter(m => new Date(m.date_end) < now);
    if (past.length > 0) return past[past.length - 1];
    return meetings[0];
  }, [meetings, params.meetingKey, now]);

  React.useEffect(() => { setManualSessionKey(undefined); }, [activeMeeting?.meeting_key]);

  const { data: sessions } = useOpenF1Sessions(activeMeeting?.meeting_key);

  const autoSessionKey = useMemo(() => {
    if (params.sessionKey) return Number(params.sessionKey);
    if (!sessions?.length) return undefined;
    const live = sessions.find(s => now >= new Date(s.date_start) && now <= new Date(s.date_end));
    if (live) return live.session_key;
    const today = now.toDateString();
    const todaySess = sessions.filter(s => new Date(s.date_start).toDateString() === today);
    if (todaySess.length > 0) {
      const done = todaySess.filter(s => new Date(s.date_end) < now);
      if (done.length > 0) return done.sort((a,b) => new Date(b.date_end).getTime() - new Date(a.date_end).getTime())[0].session_key;
      const upcoming = todaySess.filter(s => new Date(s.date_start) > now).sort((a,b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
      if (upcoming.length > 0) return upcoming[0].session_key;
    }
    const past = sessions.filter(s => new Date(s.date_end) < now);
    if (past.length > 0) return past.sort((a,b) => new Date(b.date_end).getTime() - new Date(a.date_end).getTime())[0].session_key;
    return sessions[0]?.session_key;
  }, [params.sessionKey, sessions, now]);

  const activeSessionKey = manualSessionKey ?? autoSessionKey;
  const activeSession = useMemo(() => sessions?.find(s => s.session_key === activeSessionKey), [sessions, activeSessionKey]);
  const isScheduledLive = useMemo(() => {
    if (!activeSession) return false;
    return now >= new Date(activeSession.date_start) && now <= new Date(activeSession.date_end);
  }, [activeSession, now]);

  // ── Live timing (always connected) ───────────────────────────────────────
  const {
    state: liveState, snapshot: liveSnapshot,
    positions: livePositions, drivers: liveDrivers,
    raceControlMessages: liveRCMessages, lapCount: liveLapCount,
  } = useLiveTiming();

  // Freeze last known live data when session ends
  React.useEffect(() => {
    if (liveState === "live" && liveDrivers.length > 0) {
      frozenDriversRef.current = liveDrivers;
      if (liveLapCount) frozenLapCountRef.current = liveLapCount;
    }
  }, [liveState, liveDrivers, liveLapCount]);

  const isLive  = isScheduledLive && liveState === "live"  && liveDrivers.length > 0;
  const isEnded = liveState === "ended";
  // Show frozen results right after session ends (before Ergast has them)
  const showFrozen = isEnded && frozenDriversRef.current.length > 0;

  // ── Historical fallback — only when NOT live and NOT showing frozen ───────
  const needHistorical = !isLive && !showFrozen;
  const { data: historicalPositions, isLoading: posLoading } = useOpenF1Positions(
    needHistorical ? activeSessionKey : undefined
  );
  const { data: raceControlUpdates, isLoading: rcLoading } = useOpenF1RaceControl(
    needHistorical ? activeSessionKey : undefined
  );
  const { data: circuitPath } = useOpenF1CircuitPath(
    activeMeeting?.circuit_key,
    activeMeeting?.year || new Date().getFullYear()
  );

  // ── Unified timing rows ───────────────────────────────────────────────────
  const timingData: TimingRow[] = useMemo(() => {
    // 1. Live session
    if (isLive) {
      return liveDrivers.map(d => ({
        driverNumber: d.driverNumber,
        driverId: DRIVER_NUMBER_TO_ID[d.driverNumber] || `driver_${d.driverNumber}`,
        position: d.position,
        compound: d.compound || "MEDIUM",
        tyreLaps: d.tyreAge ?? 0,
        lapDisplay: d.lastLapTime || d.lapTime || "--",
        gap: d.gapToLeader,
        inPit: d.inPit,
        pitOut: d.pitOut,
        drsActive: d.drsActive,
        source: "live" as const,
      }));
    }
    // 2. Session just ended — show frozen final standings
    if (showFrozen) {
      return frozenDriversRef.current.map(d => ({
        driverNumber: d.driverNumber,
        driverId: DRIVER_NUMBER_TO_ID[d.driverNumber] || `driver_${d.driverNumber}`,
        position: d.position,
        compound: d.compound || "MEDIUM",
        tyreLaps: d.tyreAge ?? 0,
        lapDisplay: d.lastLapTime || "--",
        gap: d.gapToLeader,
        inPit: false, pitOut: false, drsActive: false,
        source: "final" as const,
      }));
    }
    // 3. Historical from Ergast
    if (!historicalPositions?.length) return [];
    return historicalPositions.map(pos => ({
      driverNumber: pos.driver_number,
      driverId: DRIVER_NUMBER_TO_ID[pos.driver_number] || `driver_${pos.driver_number}`,
      position: pos.position,
      compound: "MEDIUM",
      tyreLaps: 0,
      lapDisplay: "--",
      gap: null,
      inPit: false, pitOut: false, drsActive: false,
      source: "historical" as const,
    }));
  }, [isLive, showFrozen, liveDrivers, historicalPositions]);

  // ── Lap counts ────────────────────────────────────────────────────────────
  const currentLap = isLive
    ? (liveLapCount?.current ?? 0)
    : showFrozen
    ? (frozenLapCountRef.current?.current ?? 0)
    : 0;
  const totalLaps = isLive
    ? (liveLapCount?.total ?? 0)
    : showFrozen
    ? (frozenLapCountRef.current?.total ?? 0)
    : 0;

  // ── Map markers ───────────────────────────────────────────────────────────
  const mapMarkers: MapMarker[] = useMemo(() => {
    // Live with real GPS coords
    if (isLive && livePositions.length > 0) {
      return liveDrivers.map(d => {
        const lp = livePositions.find(p => p.driverNumber === d.driverNumber);
        return { driverNumber: d.driverNumber, position: d.position, cx: lp?.x, cy: lp ? -lp.y : undefined };
      });
    }
    // Live or frozen without GPS — use timing order
    if ((isLive || showFrozen) && timingData.length > 0) {
      return timingData.map(d => ({ driverNumber: d.driverNumber, position: d.position }));
    }
    // Historical positions
    if (historicalPositions?.length) {
      return historicalPositions.map(p => ({ driverNumber: p.driver_number, position: p.position }));
    }
    // Always show map — use DRIVERS local standings
    return DRIVERS.slice().sort((a,b) => a.position - b.position).slice(0,20).map((d,i) => ({
      driverNumber: d.number, position: i + 1,
    }));
  }, [isLive, showFrozen, livePositions, liveDrivers, timingData, historicalPositions]);

  const hasLiveCoords = isLive && livePositions.length > 0;
  const trackPath = circuitPath || "";
  const trackStatusBanner = useMemo(() => {
    if (!isLive || !liveSnapshot?.trackStatus) return null;
    return trackStatusToFlag(liveSnapshot.trackStatus.status);
  }, [isLive, liveSnapshot]);

  const leaderDriver = useMemo(() => {
    if (!timingData.length) return "--";
    const d = getDriver(timingData[0].driverId);
    return d?.shortName || `#${timingData[0].driverNumber}`;
  }, [timingData]);

  const meetingName = activeMeeting?.meeting_name || "Grand Prix";
  const meetingFlag = activeMeeting ? getCountryFlag(activeMeeting.country_code) : "";
  const circuitName = activeMeeting?.circuit_short_name?.toUpperCase() || "CIRCUIT";
  const circuitInfo = activeMeeting ? `${activeMeeting.location} · ${activeMeeting.country_name}` : "";
  const dataLoading = meetingsLoading || (needHistorical && posLoading);
  const rcCount = isLive ? liveRCMessages.length : (raceControlUpdates?.length ?? 0);

  // ── Status label ──────────────────────────────────────────────────────────
  const statusLabel = isLive
    ? `${t("explore.live")} · LAP ${currentLap}/${totalLaps}`
    : showFrozen
    ? `FINISHED · ${totalLaps > 0 ? `${totalLaps} LAPS` : "FINAL RESULTS"}`
    : `${t("live.results")} · ${activeSession?.session_name?.toUpperCase() || t("live.recent").toUpperCase()}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Track status banner */}
        {trackStatusBanner && (
          <View style={[styles.trackStatusBanner, { backgroundColor: trackStatusBanner.color + "22", borderColor: trackStatusBanner.color }]}>
            <Text style={[styles.trackStatusText, { color: trackStatusBanner.color }]}>{trackStatusBanner.label}</Text>
          </View>
        )}

        {/* Header */}
        <LinearGradient
          colors={[isLive ? Colors.red + "22" : showFrozen ? "#FFD70022" : "#1A1A1A22", "transparent"]}
          style={[styles.headerGradient, { paddingTop: topPadding + 8 }]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.liveRow}>
                {isLive ? <LivePulse /> : (
                  <View style={[styles.liveDot, {
                    backgroundColor: showFrozen ? "#FFD700" : Colors.textTertiary
                  }]} />
                )}
                <Text style={[styles.liveLabel, !isLive && { color: showFrozen ? "#FFD700" : Colors.textSecondary }]}>
                  {statusLabel}
                </Text>
                {showFrozen && (
                  <View style={[styles.sessionBadge, { borderColor: "#FFD700" }]}>
                    <Text style={[styles.sessionBadgeText, { color: "#FFD700" }]}>FINAL</Text>
                  </View>
                )}
                {activeSession && !isLive && !showFrozen && (
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>{activeSession.session_name.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.raceName}>{meetingName}</Text>
              <Text style={styles.circuitNameText}>{circuitName} · {activeMeeting?.location || ""}</Text>
            </View>
            <Text style={styles.headerFlag}>{meetingFlag}</Text>
          </View>
        </LinearGradient>

        {/* Lap bar (only when lap count available) */}
        {totalLaps > 0 && (
          <View style={styles.lapSection}>
            <LapProgress lap={currentLap} total={totalLaps} />
            <View style={styles.lapStats}>
              {[
                { val: currentLap, label: t("live.lap") },
                { val: Math.max(0, totalLaps - currentLap), label: t("live.remaining") },
                { val: leaderDriver, label: t("live.leader"), color: "#22C55E" },
                { val: timingData.filter(d => d.inPit || d.pitOut).length, label: t("live.in_pits") },
              ].map((s, i) => (
                <View key={i} style={styles.lapStat}>
                  <Text style={[styles.lapStatVal, s.color ? { color: s.color } : {}]}>{s.val}</Text>
                  <Text style={styles.lapStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Circuit map */}
        {!!trackPath && mapMarkers.length > 0 && (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>
                {isLive ? t("live.live_positions") : showFrozen ? "FINAL POSITIONS" : t("live.race_positions")}
              </Text>
              <Text style={styles.mapSubtitle}>{hasLiveCoords ? "REAL-TIME" : t("live.top_10")}</Text>
            </View>
            <CircuitMap
              markers={mapMarkers} trackPath={trackPath}
              circuitName={circuitName} circuitInfo={circuitInfo}
              isLiveCoords={hasLiveCoords}
            />
            <View style={styles.mapLegend}>
              {mapMarkers.slice(0, 5).map(d => {
                const driverId = DRIVER_NUMBER_TO_ID[d.driverNumber];
                const driver = driverId ? getDriver(driverId) : null;
                const team = driver ? getTeam(driver.teamId) : null;
                const logo = team ? TEAM_LOGO_URLS[team.id] : undefined;
                return (
                  <View key={d.driverNumber} style={styles.mapLegendItem}>
                    <View style={[styles.mapLegendDot, { backgroundColor: team?.color || "#888" }]} />
                    {logo ? <Image source={{ uri: logo }} style={styles.teamLogoLegend} resizeMode="contain" /> : null}
                    <Text style={styles.mapLegendText}>P{d.position} {driver?.shortName || `#${d.driverNumber}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Session chips */}
        {sessions && sessions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sessionSwitcherContainer} style={styles.sessionSwitcher}>
            {sessions.map((s: OpenF1Session) => {
              const status = getSessionStatus(s);
              const isActive = s.session_key === activeSessionKey;
              const dotColor = status === "live" ? Colors.red : status === "completed" ? "#22C55E" : Colors.textTertiary;
              return (
                <TouchableOpacity key={s.session_key}
                  style={[styles.sessionChip, isActive && styles.sessionChipActive]}
                  onPress={() => setManualSessionKey(s.session_key)} activeOpacity={0.7}>
                  <View style={[styles.sessionChipDot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.sessionChipText, isActive && styles.sessionChipTextActive]}>{sessionAbbr(s.session_name)}</Text>
                  {status === "live" && <Text style={styles.sessionChipLiveTag}>LIVE</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tab toggle */}
        <View style={styles.viewToggle}>
          {(["timing", "updates"] as const).map(view => (
            <TouchableOpacity key={view}
              style={[styles.viewToggleBtn, activeView === view && styles.viewToggleBtnActive]}
              onPress={() => setActiveView(view)}>
              <Text style={[styles.viewToggleText, activeView === view && styles.viewToggleTextActive]}>
                {view === "timing" ? t("live.timing").toUpperCase() : `${t("live.race_control").toUpperCase()}${rcCount > 0 ? ` (${rcCount})` : ""}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timing tab */}
        {activeView === "timing" && (
          <View style={styles.timingSection}>
            {dataLoading && !timingData.length ? (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color={Colors.red} />
                <Text style={styles.feedLoadingText}>{t("live.loading_timing")}</Text>
              </View>
            ) : liveState === "connecting" && !timingData.length ? (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color={Colors.red} />
                <Text style={styles.feedLoadingText}>Connecting to live timing…</Text>
              </View>
            ) : !timingData.length ? (
              <View style={styles.feedEmpty}>
                <Ionicons name="timer-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.feedEmptyText}>{t("live.no_timing")}</Text>
                <Text style={styles.feedEmptySubtext}>{t("live.no_timing_sub")}</Text>
              </View>
            ) : (
              <>
                {showFrozen && (
                  <View style={styles.finalBanner}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#FFD700" />
                    <Text style={styles.finalBannerText}>SESSION FINISHED · FINAL CLASSIFICATION</Text>
                  </View>
                )}
                <View style={styles.timingHeader}>
                  <Text style={[styles.timingHeaderCell, { width: 30 }]}>{t("common.pos")}</Text>
                  <Text style={[styles.timingHeaderCell, { flex: 1 }]}>{t("common.driver")}</Text>
                  {timingData[0]?.source !== "historical" && (
                    <Text style={[styles.timingHeaderCell, { width: 45 }]}>{t("common.tyre")}</Text>
                  )}
                  <Text style={[styles.timingHeaderCell, { width: 80, textAlign: "right" as const }]}>
                    {isLive ? "GAP" : showFrozen ? "GAP / LAP" : t("common.time")}
                  </Text>
                </View>
                {timingData.map(d => <DriverTimingRow key={d.driverNumber} data={d} />)}
              </>
            )}
          </View>
        )}

        {/* RC tab */}
        {activeView === "updates" && (
          <View style={styles.timingSection}>
            {!isLive && rcLoading && (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color={Colors.red} />
                <Text style={styles.feedLoadingText}>{t("live.loading_rc")}</Text>
              </View>
            )}
            <RaceControlFeed liveMessages={liveRCMessages} historicalMessages={raceControlUpdates} isLive={isLive} />
            {((isLive && !liveRCMessages.length) || (!isLive && !rcLoading && !raceControlUpdates?.length)) && (
              <View style={styles.feedEmpty}>
                <Ionicons name="radio-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.feedEmptyText}>{t("live.no_updates")}</Text>
                <Text style={styles.feedEmptySubtext}>{t("live.no_updates_sub")}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerGradient: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { flex: 1 },
  headerFlag: { fontSize: 36 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  liveLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.red, letterSpacing: 2 },
  sessionBadge: { backgroundColor: "#2A2A2A", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: Colors.border },
  sessionBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 7, color: Colors.textSecondary, letterSpacing: 1 },
  raceName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, marginBottom: 3 },
  circuitNameText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  trackStatusBanner: { marginHorizontal: 16, marginTop: 8, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  trackStatusText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2 },
  lapSection: { paddingHorizontal: 16, marginBottom: 20 },
  lapBarWrap: { marginBottom: 16 },
  lapBarTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 8 },
  lapBarFill: { height: "100%", backgroundColor: Colors.red, borderRadius: 2 },
  lapBarText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "right" as const, letterSpacing: 1 },
  lapStats: { flexDirection: "row", justifyContent: "space-between" },
  lapStat: { alignItems: "center", flex: 1 },
  lapStatVal: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  lapStatLabel: { fontFamily: "Inter_500Medium", fontSize: 7, color: Colors.textTertiary, letterSpacing: 1.5, marginTop: 2 },
  mapSection: { marginHorizontal: 16, marginBottom: 20, backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  mapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  mapTitle: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textSecondary, letterSpacing: 2 },
  mapSubtitle: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary },
  mapContainer: { alignItems: "center", paddingVertical: 8 },
  mapSvgWrap: { width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  mapInfo: { paddingHorizontal: 14, paddingBottom: 4, paddingTop: 4, alignItems: "center" },
  mapCircuitName: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.white, letterSpacing: 1 },
  mapCircuitStats: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textSecondary, marginTop: 2 },
  mapNote: { fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.textTertiary, marginTop: 2, fontStyle: "italic" },
  mapLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, justifyContent: "center" },
  mapLegendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  mapLegendText: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary },
  teamLogoLegend: { width: 14, height: 14 },
  sessionSwitcher: { marginBottom: 12 },
  sessionSwitcherContainer: { paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" },
  sessionChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  sessionChipActive: { borderColor: Colors.red, backgroundColor: Colors.red + "18" },
  sessionChipDot: { width: 6, height: 6, borderRadius: 3 },
  sessionChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5 },
  sessionChipTextActive: { color: Colors.white },
  sessionChipLiveTag: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.red, letterSpacing: 1 },
  viewToggle: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  viewToggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  viewToggleBtnActive: { backgroundColor: Colors.red + "22" },
  viewToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textTertiary, letterSpacing: 1 },
  viewToggleTextActive: { color: Colors.white },
  timingSection: { paddingHorizontal: 16 },
  finalBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFD70011", borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#FFD70033" },
  finalBannerText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#FFD700", letterSpacing: 1.5 },
  timingHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  timingHeaderCell: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.textTertiary, letterSpacing: 1.5 },
  timingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Colors.border + "66", gap: 6, backgroundColor: Colors.card, marginBottom: 2, borderRadius: 8 },
  timingRowPit: { backgroundColor: "#1A0A00" },
  timingPos: { flexDirection: "row", alignItems: "center", width: 26 },
  timingPosNum: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.white },
  timingPhoto: { width: 28, height: 28, borderRadius: 14 },
  timingPhotoPlaceholder: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timingPhotoNum: { fontFamily: "Inter_700Bold", fontSize: 10 },
  timingBar: { width: 2.5, height: 24, borderRadius: 2 },
  timingInfo: { flex: 1 },
  timingShort: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.white },
  timingTeamRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  teamLogoSmall: { width: 12, height: 12 },
  timingTeam: { fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.textTertiary },
  tyreBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, alignItems: "center", flexDirection: "row", gap: 3 },
  tyreText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  tyreLaps: { fontFamily: "Inter_400Regular", fontSize: 7, color: Colors.textTertiary },
  drsBadge: { backgroundColor: "#22C55E22", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5 },
  drsText: { fontFamily: "Inter_700Bold", fontSize: 7, color: "#22C55E", letterSpacing: 0.5 },
  timingRight: { alignItems: "flex-end", minWidth: 70 },
  timingGap: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.white },
  timingLap: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  timingPit: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#FF8C00", letterSpacing: 1 },
  feedSection: { paddingBottom: 16 },
  feedTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  feedRow: { flexDirection: "row", gap: 10, marginBottom: 10, padding: 10, backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  feedIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  feedContent: { flex: 1 },
  feedMessage: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.white, lineHeight: 17, marginBottom: 4 },
  feedMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedTime: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary },
  feedLap: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.textSecondary, letterSpacing: 1 },
  feedFlagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  feedFlagText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.5 },
  feedLoading: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  feedLoadingText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  feedEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  feedEmptyText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  feedEmptySubtext: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
});
