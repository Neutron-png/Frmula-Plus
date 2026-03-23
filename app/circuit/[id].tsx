import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { getCircuit, RACES_2026 } from "@/constants/f1Data";
import {
  useOpenF1MeetingByCountry,
  useOpenF1Sessions,
  useOpenF1RaceResults,
  RaceResultEntry,
} from "@/hooks/useOpenF1";
import { getSessionStatus } from "@/services/openf1";
import { useTranslation } from "@/i18n";

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getRaceCountdown(dateStr: string): string {
  const now = new Date();
  const race = new Date(dateStr);
  const diffMs = race.getTime() - now.getTime();
  if (diffMs <= 0) return "";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function RaceCardUpcoming({ raceName, raceFlag, raceDate, countdown, t }: {
  raceName: string; raceFlag: string; raceDate: string; countdown: string; t: (k: string) => string;
}) {
  return (
    <>
      <View style={styles.raceCardHeader}>
        <Text style={styles.raceCardName}>{raceFlag} {raceName}</Text>
        <View style={[styles.statusBadge, styles.statusUpcoming]}>
          <Text style={styles.statusText}>{t("circuit.upcoming")}</Text>
        </View>
      </View>
      <Text style={styles.raceDate}>{formatRaceDate(raceDate)}</Text>
      {countdown !== "" && (
        <View style={styles.countdownRow}>
          <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}
      <View style={styles.upcomingPlaceholder}>
        <Ionicons name="flag-outline" size={28} color={Colors.textTertiary} />
        <Text style={styles.upcomingPlaceholderText}>Race not yet started</Text>
        <Text style={styles.upcomingPlaceholderSub}>Results will appear here after the race</Text>
      </View>
    </>
  );
}

function RaceCardLive({ raceName, raceFlag, raceDate, raceSession, apiMeeting, t }: {
  raceName: string; raceFlag: string; raceDate: string;
  raceSession: { session_key: number } | undefined;
  apiMeeting: { meeting_key: number } | undefined;
  t: (k: string) => string;
}) {
  return (
    <>
      <View style={styles.raceCardHeader}>
        <Text style={styles.raceCardName}>{raceFlag} {raceName}</Text>
        <View style={[styles.statusBadge, styles.statusLive]}>
          <Text style={styles.statusText}>{t("circuit.live")}</Text>
        </View>
      </View>
      <Text style={styles.raceDate}>{formatRaceDate(raceDate)}</Text>
      <View style={styles.liveRow}>
        <View style={styles.livePulse} />
        <Text style={styles.liveLabel}>SESSION IN PROGRESS</Text>
      </View>
      {raceSession && (
        <TouchableOpacity
          style={styles.watchLiveBtn}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/live",
              params: {
                sessionKey: raceSession.session_key,
                meetingKey: apiMeeting?.meeting_key,
              },
            })
          }
        >
          <Ionicons name="radio" size={14} color="#fff" />
          <Text style={styles.watchLiveText}>Watch Live</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function RaceCardCompleted({ raceName, raceFlag, raceDate, results, isLoading, isError, t }: {
  raceName: string; raceFlag: string; raceDate: string;
  results: RaceResultEntry[]; isLoading: boolean; isError: boolean;
  t: (k: string) => string;
}) {
  const winner = results[0];
  const top5 = results.slice(0, 5);

  return (
    <>
      <View style={styles.raceCardHeader}>
        <Text style={styles.raceCardName}>{raceFlag} {raceName}</Text>
        <View style={[styles.statusBadge, styles.statusCompleted]}>
          <Text style={styles.statusText}>{t("circuit.finished")}</Text>
        </View>
      </View>
      <Text style={styles.raceDate}>{formatRaceDate(raceDate)}</Text>

      {isLoading && (
        <View style={styles.resultsLoading}>
          <ActivityIndicator size="small" color={Colors.red} />
          <Text style={styles.resultsLoadingText}>{t("common.loading")}</Text>
        </View>
      )}

      {!isLoading && isError && (
        <View style={styles.resultsEmpty}>
          <Ionicons name="alert-circle-outline" size={24} color={Colors.textTertiary} />
          <Text style={styles.resultsEmptyText}>Race data currently unavailable</Text>
        </View>
      )}

      {!isLoading && !isError && !winner && (
        <View style={styles.resultsEmpty}>
          <Ionicons name="timer-outline" size={24} color={Colors.textTertiary} />
          <Text style={styles.resultsEmptyText}>No official result available yet</Text>
        </View>
      )}

      {winner && (
        <View style={styles.raceWinnerRow}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <View style={[styles.winnerTeamBar, { backgroundColor: winner.teamColour }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.raceWinner}>{winner.driverName}</Text>
            {winner.teamName !== "" && (
              <Text style={styles.raceWinnerTeam}>{winner.teamName}</Text>
            )}
          </View>
          <Text style={styles.winnerLabel}>{t("common.winner")}</Text>
        </View>
      )}

      {top5.length > 0 && (
        <View style={styles.raceResults}>
          <Text style={styles.resultsHeader}>{t("circuit.top_results")}</Text>
          {top5.map((r) => (
            <View key={r.driverNumber} style={styles.resultRow}>
              <Text style={[styles.resultPos, r.position === 1 && { color: "#FFD700" }]}>
                P{r.position}
              </Text>
              <View style={[styles.resultTeamDot, { backgroundColor: r.teamColour }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultDriver}>{r.driverName}</Text>
                {r.teamName !== "" && (
                  <Text style={styles.resultTeam}>{r.teamName}</Text>
                )}
              </View>
              <Text style={styles.resultAcronym}>{r.driverAcronym}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export default function CircuitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const circuit = getCircuit(id);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const race = useMemo(
    () => (circuit ? RACES_2026.find((r) => r.circuitId === circuit.id) : undefined),
    [circuit]
  );

  const { data: apiMeeting, isLoading: meetingLoading } = useOpenF1MeetingByCountry(
    circuit?.country,
    2026
  );
  const { data: apiSessions, isLoading: sessionsLoading } = useOpenF1Sessions(
    apiMeeting?.meeting_key
  );

  const raceSession = useMemo(
    () => apiSessions?.find((s) => s.session_type === "Race"),
    [apiSessions]
  );

  const sessionStatus = useMemo((): "live" | "completed" | "upcoming" => {
    if (raceSession) return getSessionStatus(raceSession);
    if (!race) return "upcoming";
    const now = new Date();
    const raceDate = new Date(race.date);
    if (now > new Date(raceDate.getTime() + 3 * 60 * 60 * 1000)) return "completed";
    return "upcoming";
  }, [raceSession, race]);

  const { results, isLoading: resultsLoading, isError: resultsError } = useOpenF1RaceResults(
    raceSession?.session_key,
    sessionStatus === "completed"
  );

  const raceDateStr = raceSession?.date_start ?? race?.date ?? "";
  const raceName = apiMeeting?.meeting_official_name ?? race?.name ?? "";
  const raceFlag = race?.flag ?? "";
  const countdown = raceDateStr ? getRaceCountdown(raceDateStr) : "";

  if (!circuit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Circuit not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColors: Record<string, string> = {
    street: "#FF8000",
    permanent: "#3671C6",
    hybrid: "#229971",
  };
  const typeColor = typeColors[circuit.type] || Colors.red;

  const apiLoading = meetingLoading || sessionsLoading;

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: topPadding }]}>
        {circuit.imageUrl && (
          <Image
            source={{ uri: circuit.imageUrl }}
            style={styles.heroBgImage}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={[typeColor + "66", typeColor + "22", "#0A0A0A"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.heroNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "33", borderColor: typeColor }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{circuit.type.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.heroFlag}>{circuit.flag}</Text>
        <Text style={styles.heroName}>{circuit.name}</Text>
        <Text style={styles.heroLocation}>{circuit.location}, {circuit.country}</Text>
        <Text style={styles.heroFirstGP}>First Grand Prix: {circuit.firstGP}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }}
      >
        <Text style={styles.sectionTitle}>{t("circuit.statistics")}</Text>
        <View style={styles.statsGrid}>
          {[
            { label: t("circuit.race_laps"), value: circuit.laps },
            { label: t("circuit.length"), value: `${circuit.length}km` },
            { label: t("circuit.corners"), value: circuit.corners },
            { label: t("circuit.drs_zones"), value: circuit.drsZones },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statBoxValue}>{s.value}</Text>
              <Text style={styles.statBoxLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t("circuit.lap_record")}</Text>
        <View style={styles.lapRecordCard}>
          <LinearGradient
            colors={[Colors.red + "22", "#1A1A1A"]}
            style={styles.lapRecordGradient}
          >
            <View style={styles.lapRecordLeft}>
              <Ionicons name="timer" size={24} color={Colors.red} />
              <View>
                <Text style={styles.lapRecordTime}>{circuit.lapRecord}</Text>
                <Text style={styles.lapRecordHolder}>{circuit.lapRecordHolder}</Text>
                <Text style={styles.lapRecordYear}>{circuit.lapRecordYear}</Text>
              </View>
            </View>
            <View style={styles.lapRecordRight}>
              <Text style={styles.lapRecordLabel}>{t("circuit.lap_record")}</Text>
            </View>
          </LinearGradient>
        </View>

        {race && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t("circuit.race_2026")}</Text>
            <View style={styles.raceCard}>
              {apiLoading && (
                <View style={styles.apiLoadingRow}>
                  <ActivityIndicator size="small" color={Colors.red} />
                  <Text style={styles.apiLoadingText}>{t("common.loading")}</Text>
                </View>
              )}

              {!apiLoading && sessionStatus === "upcoming" && (
                <RaceCardUpcoming
                  raceName={raceName}
                  raceFlag={raceFlag}
                  raceDate={raceDateStr}
                  countdown={countdown}
                  t={t}
                />
              )}

              {!apiLoading && sessionStatus === "live" && (
                <RaceCardLive
                  raceName={raceName}
                  raceFlag={raceFlag}
                  raceDate={raceDateStr}
                  raceSession={raceSession}
                  apiMeeting={apiMeeting}
                  t={t}
                />
              )}

              {!apiLoading && sessionStatus === "completed" && (
                <RaceCardCompleted
                  raceName={raceName}
                  raceFlag={raceFlag}
                  raceDate={raceDateStr}
                  results={results}
                  isLoading={resultsLoading}
                  isError={resultsError}
                  t={t}
                />
              )}
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t("circuit.about")}</Text>
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>{circuit.description}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  errorContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 18, color: Colors.white, marginBottom: 12 },
  backLink: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.red },
  hero: { paddingHorizontal: 16, paddingBottom: 24, overflow: "hidden" },
  heroBgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.22 },
  heroNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  typeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  heroFlag: { fontSize: 40, marginBottom: 8 },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white, lineHeight: 28, marginBottom: 6 },
  heroLocation: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  heroFirstGP: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.5)" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { flex: 1, minWidth: "45%", backgroundColor: Colors.card, borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statBoxValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white, marginBottom: 4 },
  statBoxLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1, textAlign: "center" },
  lapRecordCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  lapRecordGradient: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lapRecordLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  lapRecordTime: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.white, marginBottom: 2 },
  lapRecordHolder: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  lapRecordYear: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  lapRecordRight: {},
  lapRecordLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.red, letterSpacing: 2 },
  raceCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  apiLoadingRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 24, justifyContent: "center" },
  apiLoadingText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  raceCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  raceCardName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusLive: { backgroundColor: Colors.red },
  statusCompleted: { backgroundColor: Colors.border },
  statusUpcoming: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.white, letterSpacing: 1 },
  raceDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  countdownText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  upcomingPlaceholder: { alignItems: "center", paddingVertical: 20, gap: 6 },
  upcomingPlaceholderText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  upcomingPlaceholderSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "center" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  liveLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.red, letterSpacing: 1.5 },
  resultsLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16 },
  resultsLoadingText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  resultsEmpty: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
  resultsEmptyText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary, flex: 1 },
  raceWinnerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, backgroundColor: "#FFD70011", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#FFD70033" },
  winnerTeamBar: { width: 3, height: 32, borderRadius: 2 },
  raceWinner: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white },
  raceWinnerTeam: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  winnerLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#FFD700", letterSpacing: 1 },
  raceResults: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4 },
  resultsHeader: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 10 },
  resultPos: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textSecondary, width: 28 },
  resultTeamDot: { width: 3, height: 28, borderRadius: 2 },
  resultDriver: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.white },
  resultTeam: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  resultAcronym: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textTertiary, letterSpacing: 0.5 },
  watchLiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.red, borderRadius: 10, paddingVertical: 10, marginTop: 10 },
  watchLiveText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff", letterSpacing: 1 },
  descriptionCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  descriptionText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
