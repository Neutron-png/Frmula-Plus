import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  getTeam,
  getDriver,
} from "@/constants/f1Data";
import { getDriverPhoto } from "@/constants/driverPhotos";
import {
  useOpenF1RaceControl,
  useOpenF1Meetings,
  useOpenF1Sessions,
  useOpenF1Positions,
  useOpenF1Stints,
  useOpenF1Laps,
  useOpenF1Drivers,
  useOpenF1CircuitPath,
} from "@/hooks/useOpenF1";
import {
  getRaceControlIcon,
  getMeetingStatus,
  getCountryFlag,
  getLatestStints,
  DRIVER_NUMBER_TO_ID,
  OpenF1RaceControl,
  OpenF1Meeting,
  OpenF1Position,
  OpenF1Stint,
  OpenF1Lap,
} from "@/services/openf1";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = 240;

const TEAM_LOGO_URLS: Record<string, string> = {
  mclaren: "https://media.formula1.com/content/dam/fom-website/teams/2024/mclaren-logo.png",
  ferrari: "https://media.formula1.com/content/dam/fom-website/teams/2024/ferrari-logo.png",
  mercedes: "https://media.formula1.com/content/dam/fom-website/teams/2024/mercedes-logo.png",
  redbull: "https://media.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing-logo.png",
  astonmartin: "https://media.formula1.com/content/dam/fom-website/teams/2024/aston-martin-logo.png",
  williams: "https://media.formula1.com/content/dam/fom-website/teams/2024/williams-logo.png",
  alpine: "https://media.formula1.com/content/dam/fom-website/teams/2024/alpine-logo.png",
  racingbulls: "https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png",
  haas: "https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png",
  audi: "https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png",
  cadillac: "https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png",
};

const TYRE_COLORS: Record<string, string> = {
  SOFT: "#FF3333", MEDIUM: "#FFEE00", HARD: "#FFFFFF", INTERMEDIATE: "#33CC44", WET: "#3399FF",
  S: "#FF3333", M: "#FFEE00", H: "#FFFFFF", I: "#33CC44", W: "#3399FF",
};
const TYRE_BG: Record<string, string> = {
  SOFT: "#FF333322", MEDIUM: "#FFEE0022", HARD: "#FFFFFF22", INTERMEDIATE: "#33CC4422", WET: "#3399FF22",
  S: "#FF333322", M: "#FFEE0022", H: "#FFFFFF22", I: "#33CC4422", W: "#3399FF22",
};
const TYRE_SHORT: Record<string, string> = {
  SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W",
  S: "S", M: "M", H: "H", I: "I", W: "W",
};

function parseSvgPath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const nums = d.match(/-?[\d.]+/g);
  if (!nums) return points;
  for (let i = 0; i < nums.length - 1; i += 2) {
    points.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
  }
  return points;
}

function interpolateOnPath(pts: { x: number; y: number }[], fraction: number): { x: number; y: number } {
  if (pts.length === 0) return { x: 50, y: 50 };
  const idx = fraction * (pts.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, pts.length - 1);
  const t = idx - lo;
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * t,
  };
}

function LivePulse() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.2, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.liveDot, animStyle]} />;
}

function RaceControlFeed({ updates }: { updates: OpenF1RaceControl[] }) {
  if (!updates || updates.length === 0) return null;

  return (
    <View style={styles.feedSection}>
      <Text style={styles.feedTitle}>RACE CONTROL</Text>
      {updates.slice(0, 20).map((update, idx) => {
        const { icon, color } = getRaceControlIcon(update.category, update.flag);
        const time = new Date(update.date);
        const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        return (
          <View key={`${update.date}-${idx}`} style={styles.feedRow}>
            <View style={[styles.feedIcon, { backgroundColor: color + "22" }]}>
              <Ionicons name={icon as any} size={12} color={color} />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedMessage} numberOfLines={2}>{update.message}</Text>
              <View style={styles.feedMeta}>
                <Text style={styles.feedTime}>{timeStr}</Text>
                {update.lap_number != null && update.lap_number > 0 && (
                  <Text style={styles.feedLap}>LAP {update.lap_number}</Text>
                )}
                {update.flag && (
                  <View style={[styles.feedFlagBadge, { backgroundColor: color + "22" }]}>
                    <Text style={[styles.feedFlagText, { color }]}>{update.flag}</Text>
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

function CircuitMap({ positions, trackPath, circuitName, circuitInfo }: {
  positions: OpenF1Position[];
  trackPath: string;
  circuitName: string;
  circuitInfo: string;
}) {
  const sorted = positions.slice(0, 10);
  const pathPoints = useMemo(() => parseSvgPath(trackPath), [trackPath]);

  if (pathPoints.length === 0) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapInfo}>
          <Text style={styles.mapCircuitName}>{circuitName}</Text>
          <Text style={styles.mapCircuitStats}>{circuitInfo}</Text>
        </View>
      </View>
    );
  }

  const allX = pathPoints.map((p) => p.x);
  const allY = pathPoints.map((p) => p.y);
  const pad = 20;
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapInfo}>
        <Text style={styles.mapCircuitName}>{circuitName}</Text>
        <Text style={styles.mapCircuitStats}>{circuitInfo}</Text>
      </View>
      <View style={styles.mapSvgWrap}>
        <Svg width="100%" height={MAP_HEIGHT} viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`} preserveAspectRatio="xMidYMid meet">
          <Path d={trackPath} stroke="#2A2A2A" strokeWidth={Math.max(8, vbWidth * 0.015)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={trackPath} stroke="#3A3A3A" strokeWidth={Math.max(5, vbWidth * 0.01)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={trackPath} stroke="#555" strokeWidth={Math.max(1, vbWidth * 0.002)} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
          {sorted.map((d) => {
            const driverId = DRIVER_NUMBER_TO_ID[d.driver_number];
            const driver = driverId ? getDriver(driverId) : null;
            const team = driver ? getTeam(driver.teamId) : null;
            const frac = (d.position - 1) / Math.max(sorted.length - 1, 1);
            const pos = interpolateOnPath(pathPoints, frac);
            const color = team?.color || "#888";
            const r = Math.max(4, vbWidth * 0.014);
            return (
              <G key={d.driver_number}>
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

function LapProgress({ lap, total }: { lap: number; total: number }) {
  const progress = total > 0 ? lap / total : 0;
  return (
    <View style={styles.lapBarWrap}>
      <View style={styles.lapBarTrack}>
        <View style={[styles.lapBarFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.lapBarText}>LAP {lap} / {total}</Text>
    </View>
  );
}

function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "--:--.---";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

interface DriverTimingData {
  driverNumber: number;
  driverId: string;
  position: number;
  compound: string;
  tyreLaps: number;
  pitStops: number;
  lapDuration: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  isPitOutLap: boolean;
}

function DriverTimingRow({ data }: { data: DriverTimingData }) {
  const driver = getDriver(data.driverId);
  const team = getTeam(driver?.teamId || "");
  const compound = data.compound || "M";
  const compactCompound = TYRE_SHORT[compound] || compound.charAt(0);
  const teamLogoUrl = team ? TEAM_LOGO_URLS[team.id] : undefined;

  return (
    <View style={[styles.timingRow, data.isPitOutLap && styles.timingRowPit]}>
      <View style={styles.timingPos}>
        <Text style={[styles.timingPosNum, data.position === 1 && { color: "#FFD700" }]}>
          {data.position}
        </Text>
      </View>
      {getDriverPhoto(data.driverId) ? (
        <Image source={getDriverPhoto(data.driverId)!} style={styles.timingPhoto} />
      ) : (
        <View style={[styles.timingPhotoPlaceholder, { backgroundColor: (team?.color || "#555") + "33" }]}>
          <Text style={[styles.timingPhotoNum, { color: team?.color }]}>{driver?.number || data.driverNumber}</Text>
        </View>
      )}
      <View style={[styles.timingBar, { backgroundColor: team?.color || "#555" }]} />
      <View style={styles.timingInfo}>
        <Text style={styles.timingShort}>{driver?.shortName || `P${data.driverNumber}`}</Text>
        <View style={styles.timingTeamRow}>
          {teamLogoUrl ? (
            <Image source={{ uri: teamLogoUrl }} style={styles.teamLogoSmall} resizeMode="contain" />
          ) : null}
          <Text style={styles.timingTeam}>{team?.shortName || ""}</Text>
        </View>
      </View>
      <View style={[styles.tyreBadge, { backgroundColor: TYRE_BG[compound] || "#FFFFFF22" }]}>
        <Text style={[styles.tyreText, { color: TYRE_COLORS[compound] || "#fff" }]}>{compactCompound}</Text>
        <Text style={styles.tyreLaps}>{data.tyreLaps}</Text>
      </View>
      <View style={styles.timingRight}>
        {data.isPitOutLap ? (
          <Text style={styles.timingPit}>PIT</Text>
        ) : (
          <Text style={styles.timingLap}>{formatLapTime(data.lapDuration)}</Text>
        )}
      </View>
    </View>
  );
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sessionKey?: string; meetingKey?: string }>();
  const [activeView, setActiveView] = React.useState<"timing" | "updates">("timing");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: meetings, isLoading: meetingsLoading } = useOpenF1Meetings();
  const { data: openF1Drivers } = useOpenF1Drivers();

  const activeMeeting: OpenF1Meeting | undefined = useMemo(() => {
    if (!meetings) return undefined;
    if (params.meetingKey) {
      const found = meetings.find((m) => m.meeting_key === Number(params.meetingKey));
      if (found) return found;
    }
    const live = meetings.find((m) => getMeetingStatus(m) === "live");
    if (live) return live;
    const now = new Date();
    const pastMeetings = meetings.filter((m) => new Date(m.date_end) < now);
    if (pastMeetings.length > 0) return pastMeetings[pastMeetings.length - 1];
    return meetings[0];
  }, [meetings, params.meetingKey]);

  const { data: sessions } = useOpenF1Sessions(activeMeeting?.meeting_key);
  const activeSessionKey = useMemo(() => {
    if (params.sessionKey) return Number(params.sessionKey);
    if (!sessions) return undefined;
    const raceSessions = sessions.filter((s) => s.session_type === "Race");
    if (raceSessions.length > 0) return raceSessions[raceSessions.length - 1].session_key;
    return sessions[sessions.length - 1]?.session_key;
  }, [params.sessionKey, sessions]);

  const { data: positions, isLoading: posLoading } = useOpenF1Positions(activeSessionKey);
  const { data: stints } = useOpenF1Stints(activeSessionKey);
  const { data: laps } = useOpenF1Laps(activeSessionKey);
  const { data: raceControlUpdates, isLoading: rcLoading } = useOpenF1RaceControl(activeSessionKey);
  const { data: circuitPath } = useOpenF1CircuitPath(activeMeeting?.circuit_key, activeMeeting?.year || new Date().getFullYear());

  const isLive = activeMeeting ? getMeetingStatus(activeMeeting) === "live" : false;

  const latestStints = useMemo(() => {
    if (!stints) return {};
    return getLatestStints(stints);
  }, [stints]);

  const driverLapData = useMemo(() => {
    if (!laps) return {} as Record<number, OpenF1Lap>;
    const latest: Record<number, OpenF1Lap> = {};
    laps.forEach((l) => {
      if (!latest[l.driver_number] || l.lap_number > latest[l.driver_number].lap_number) {
        if (l.lap_duration !== null) {
          latest[l.driver_number] = l;
        }
      }
    });
    return latest;
  }, [laps]);

  const maxLap = useMemo(() => {
    if (!laps || laps.length === 0) return 0;
    return Math.max(...laps.map((l) => l.lap_number));
  }, [laps]);

  const totalLaps = useMemo(() => {
    if (!raceControlUpdates) return maxLap;
    const chequered = raceControlUpdates.find((u) => u.flag === "CHEQUERED");
    if (chequered && chequered.lap_number) return chequered.lap_number;
    return maxLap;
  }, [raceControlUpdates, maxLap]);

  const timingData: DriverTimingData[] = useMemo(() => {
    if (!positions) return [];
    return positions.map((pos) => {
      const driverId = DRIVER_NUMBER_TO_ID[pos.driver_number] || `driver_${pos.driver_number}`;
      const stint = latestStints[pos.driver_number];
      const lapData = driverLapData[pos.driver_number];
      const allStintsForDriver = stints?.filter((s) => s.driver_number === pos.driver_number) || [];
      const tyreLaps = stint ? (stint.lap_end - stint.lap_start + 1) : 0;

      return {
        driverNumber: pos.driver_number,
        driverId,
        position: pos.position,
        compound: stint?.compound || "MEDIUM",
        tyreLaps,
        pitStops: Math.max(0, allStintsForDriver.length - 1),
        lapDuration: lapData?.lap_duration || null,
        sector1: lapData?.duration_sector_1 || null,
        sector2: lapData?.duration_sector_2 || null,
        sector3: lapData?.duration_sector_3 || null,
        isPitOutLap: lapData?.is_pit_out_lap || false,
      };
    });
  }, [positions, latestStints, driverLapData, stints]);

  const leaderDriver = useMemo(() => {
    if (timingData.length === 0) return "--";
    const leader = timingData[0];
    const driver = getDriver(leader.driverId);
    return driver?.shortName || `#${leader.driverNumber}`;
  }, [timingData]);

  const meetingName = activeMeeting?.meeting_name || "Grand Prix";
  const meetingFlag = activeMeeting ? getCountryFlag(activeMeeting.country_code) : "";
  const circuitName = activeMeeting?.circuit_short_name?.toUpperCase() || "CIRCUIT";
  const circuitInfo = activeMeeting
    ? `${activeMeeting.location} · ${activeMeeting.country_name}`
    : "";

  const trackPathToUse = circuitPath || "";

  const dataLoading = meetingsLoading || posLoading;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient
          colors={[isLive ? Colors.red + "22" : "#1A1A1A22", "transparent"]}
          style={[styles.headerGradient, { paddingTop: topPadding + 8 }]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.liveRow}>
                {isLive ? <LivePulse /> : <View style={[styles.liveDot, { backgroundColor: Colors.textTertiary }]} />}
                <Text style={[styles.liveLabel, !isLive && { color: Colors.textSecondary }]}>
                  {isLive ? `LIVE · LAP ${maxLap}/${totalLaps}` : `RESULTS · ${totalLaps} LAPS`}
                </Text>
              </View>
              <Text style={styles.raceName}>{meetingName}</Text>
              <Text style={styles.circuitNameText}>{circuitName} · {activeMeeting?.location || ""}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerFlag}>{meetingFlag}</Text>
            </View>
          </View>
        </LinearGradient>

        {totalLaps > 0 && (
          <View style={styles.lapSection}>
            <LapProgress lap={maxLap} total={totalLaps} />
            <View style={styles.lapStats}>
              <View style={styles.lapStat}>
                <Text style={styles.lapStatVal}>{maxLap}</Text>
                <Text style={styles.lapStatLabel}>LAP</Text>
              </View>
              <View style={styles.lapStat}>
                <Text style={styles.lapStatVal}>{Math.max(0, totalLaps - maxLap)}</Text>
                <Text style={styles.lapStatLabel}>REMAINING</Text>
              </View>
              <View style={styles.lapStat}>
                <Text style={[styles.lapStatVal, { color: "#22C55E" }]}>{leaderDriver}</Text>
                <Text style={styles.lapStatLabel}>LEADER</Text>
              </View>
              <View style={styles.lapStat}>
                <Text style={styles.lapStatVal}>{timingData.filter((d) => d.isPitOutLap).length}</Text>
                <Text style={styles.lapStatLabel}>IN PITS</Text>
              </View>
            </View>
          </View>
        )}

        {trackPathToUse && positions && positions.length > 0 && (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>{isLive ? "LIVE POSITIONS" : "RACE POSITIONS"}</Text>
              <Text style={styles.mapSubtitle}>Top 10 · by race order</Text>
            </View>
            <CircuitMap positions={positions} trackPath={trackPathToUse} circuitName={circuitName} circuitInfo={circuitInfo} />
            <View style={styles.mapLegend}>
              {positions.slice(0, 5).map((d) => {
                const driverId = DRIVER_NUMBER_TO_ID[d.driver_number];
                const driver = driverId ? getDriver(driverId) : null;
                const team = driver ? getTeam(driver.teamId) : null;
                const logoUrl = team ? TEAM_LOGO_URLS[team.id] : undefined;
                return (
                  <View key={d.driver_number} style={styles.mapLegendItem}>
                    <View style={[styles.mapLegendDot, { backgroundColor: team?.color || "#888" }]} />
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.teamLogoLegend} resizeMode="contain" />
                    ) : null}
                    <Text style={styles.mapLegendText}>P{d.position} {driver?.shortName || `#${d.driver_number}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, activeView === "timing" && styles.viewToggleBtnActive]}
            onPress={() => setActiveView("timing")}
          >
            <Text style={[styles.viewToggleText, activeView === "timing" && styles.viewToggleTextActive]}>TIMING</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, activeView === "updates" && styles.viewToggleBtnActive]}
            onPress={() => setActiveView("updates")}
          >
            <Text style={[styles.viewToggleText, activeView === "updates" && styles.viewToggleTextActive]}>
              RACE CONTROL{raceControlUpdates ? ` (${raceControlUpdates.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {activeView === "timing" && (
          <View style={styles.timingSection}>
            {dataLoading && timingData.length === 0 ? (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color={Colors.red} />
                <Text style={styles.feedLoadingText}>Loading timing data...</Text>
              </View>
            ) : timingData.length === 0 ? (
              <View style={styles.feedEmpty}>
                <Ionicons name="timer-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.feedEmptyText}>No timing data available</Text>
                <Text style={styles.feedEmptySubtext}>Data appears during live sessions</Text>
              </View>
            ) : (
              <>
                <View style={styles.timingHeader}>
                  <Text style={[styles.timingHeaderCell, { width: 30 }]}>POS</Text>
                  <Text style={[styles.timingHeaderCell, { flex: 1 }]}>DRIVER</Text>
                  <Text style={[styles.timingHeaderCell, { width: 45 }]}>TYRE</Text>
                  <Text style={[styles.timingHeaderCell, { width: 80, textAlign: "right" as const }]}>TIME</Text>
                </View>
                {timingData.map((d) => (
                  <DriverTimingRow key={d.driverNumber} data={d} />
                ))}
              </>
            )}
          </View>
        )}

        {activeView === "updates" && (
          <View style={styles.timingSection}>
            {rcLoading && (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="small" color={Colors.red} />
                <Text style={styles.feedLoadingText}>Loading race control data...</Text>
              </View>
            )}
            {raceControlUpdates && raceControlUpdates.length > 0 ? (
              <RaceControlFeed updates={raceControlUpdates} />
            ) : !rcLoading ? (
              <View style={styles.feedEmpty}>
                <Ionicons name="radio-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.feedEmptyText}>No race control messages</Text>
                <Text style={styles.feedEmptySubtext}>Updates appear during live sessions</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerGradient: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { flex: 1 },
  headerRight: {},
  headerFlag: { fontSize: 36 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  liveLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.red, letterSpacing: 2 },
  raceName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, marginBottom: 3 },
  circuitNameText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
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
  mapLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, justifyContent: "center" },
  mapLegendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  mapLegendText: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary },
  teamLogoLegend: { width: 14, height: 14 },
  viewToggle: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  viewToggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  viewToggleBtnActive: { backgroundColor: Colors.red + "22" },
  viewToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textTertiary, letterSpacing: 1 },
  viewToggleTextActive: { color: Colors.white },
  timingSection: { paddingHorizontal: 16 },
  timingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timingHeaderCell: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.textTertiary, letterSpacing: 1.5 },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "66",
    gap: 6,
    backgroundColor: Colors.card,
    marginBottom: 2,
    borderRadius: 8,
  },
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
