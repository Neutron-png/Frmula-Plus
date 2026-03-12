import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { CIRCUITS, TEAMS, RACES_2026, getDriver } from "@/constants/f1Data";
import { useConstructorStandings } from "@/hooks/useF1Data";
import { useOpenF1Meetings, useOpenF1Sessions } from "@/hooks/useOpenF1";
import {
  getMeetingStatus,
  formatDateRange,
  getCountryFlag,
  getSessionIcon,
  OpenF1Meeting,
} from "@/services/openf1";

type ExploreTab = "circuits" | "teams" | "calendar";

function MeetingCard({ meeting, index }: { meeting: OpenF1Meeting; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const status = getMeetingStatus(meeting);
  const flag = getCountryFlag(meeting.country_code);
  const dateRange = formatDateRange(meeting.date_start, meeting.date_end);
  const isLive = status === "live";
  const isCompleted = status === "completed";

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.raceCard,
          isLive && styles.raceCardLive,
          isCompleted && styles.raceCardCompleted,
        ]}
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
      >
        {isLive && (
          <LinearGradient
            colors={[Colors.red + "22", "transparent"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
        <View style={styles.raceRound}>
          <Text style={[styles.raceRoundNum, isLive && { color: Colors.red }]}>
            {String(index + 1).padStart(2, "0")}
          </Text>
          {isLive && <View style={styles.raceLiveDot} />}
          {isCompleted && <Ionicons name="checkmark" size={14} color="#22C55E" />}
        </View>
        <View style={styles.raceInfo}>
          <Text style={styles.raceFlag}>{flag}</Text>
          <View style={styles.raceInfoText}>
            <Text style={styles.raceName} numberOfLines={1}>{meeting.meeting_name}</Text>
            <Text style={styles.raceDate}>{dateRange}</Text>
            <Text style={styles.raceCircuit}>{meeting.circuit_short_name} · {meeting.location}</Text>
          </View>
        </View>
        {isLive && (
          <View style={styles.raceLiveBadge}>
            <Text style={styles.raceLiveBadgeText}>LIVE</Text>
          </View>
        )}
        {status === "upcoming" && (
          <View style={styles.raceUpcomingBadge}>
            <Text style={styles.raceUpcomingText}>UPCOMING</Text>
          </View>
        )}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
      {expanded && <SessionList meetingKey={meeting.meeting_key} />}
    </View>
  );
}

function SessionList({ meetingKey }: { meetingKey: number }) {
  const { data: sessions, isLoading } = useOpenF1Sessions(meetingKey);

  if (isLoading) {
    return (
      <View style={styles.sessionLoading}>
        <ActivityIndicator size="small" color={Colors.red} />
      </View>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <View style={styles.sessionLoading}>
        <Text style={styles.sessionEmptyText}>Sessions not yet available</Text>
      </View>
    );
  }

  return (
    <View style={styles.sessionList}>
      {sessions.map((session) => {
        const sessionDate = new Date(session.date_start);
        const now = new Date();
        const isComplete = sessionDate < now;
        const isActive = now >= sessionDate && now <= new Date(session.date_end);
        const iconName = getSessionIcon(session.session_type) as any;

        return (
          <TouchableOpacity
            key={session.session_key}
            style={[styles.sessionRow, isActive && styles.sessionRowActive]}
            activeOpacity={0.85}
            onPress={() => {
              router.push({ pathname: "/(tabs)/live", params: { sessionKey: session.session_key, meetingKey: session.meeting_key } });
            }}
          >
            <Ionicons name={iconName} size={14} color={isActive ? Colors.red : isComplete ? "#22C55E" : Colors.textTertiary} />
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionName, isActive && { color: Colors.red }]}>{session.session_name}</Text>
              <Text style={styles.sessionTime}>
                {sessionDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}
                {sessionDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            {isActive && (
              <View style={styles.sessionLiveBadge}>
                <Text style={styles.sessionLiveText}>LIVE</Text>
              </View>
            )}
            {isComplete && !isActive && <Ionicons name="checkmark-circle" size={14} color="#22C55E" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ExploreTab>("calendar");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: meetings, isLoading: meetingsLoading } = useOpenF1Meetings();
  const { data: apiTeams } = useConstructorStandings();
  const teamsData = apiTeams?.length ? apiTeams : TEAMS;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Text style={styles.screenTitle}>EXPLORE</Text>
        <Text style={styles.screenSeason}>2026 SEASON{meetings ? ` · ${meetings.length} RACES` : ""}</Text>
        <View style={styles.tabRow}>
          {(["calendar", "circuits", "teams"] as ExploreTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
      >
        <TouchableOpacity
          style={styles.learnCard}
          activeOpacity={0.85}
          onPress={() => router.push("/notifications-settings")}
        >
          <LinearGradient
            colors={[Colors.red + "22", "transparent"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <View style={styles.learnCardLeft}>
            <Ionicons name="notifications" size={22} color={Colors.red} />
            <View>
              <Text style={styles.learnCardTitle}>NOTIFICATIONS</Text>
              <Text style={styles.learnCardSubtitle}>Set race reminders & alerts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {activeTab === "calendar" && (
          <>
            {meetingsLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.red} />
                <Text style={styles.loadingText}>Loading schedule...</Text>
              </View>
            )}
            {meetings && meetings.map((meeting, idx) => (
              <MeetingCard key={meeting.meeting_key} meeting={meeting} index={idx} />
            ))}
            {!meetingsLoading && !meetings && RACES_2026.map((race) => {
              const circuit = CIRCUITS.find((c) => c.id === race.circuitId);
              const winner = race.winner ? getDriver(race.winner) : null;
              return (
                <View key={race.id} style={styles.raceCard}>
                  <View style={styles.raceRound}>
                    <Text style={styles.raceRoundNum}>{String(race.round).padStart(2, "0")}</Text>
                  </View>
                  <View style={styles.raceInfo}>
                    <Text style={styles.raceFlag}>{race.flag}</Text>
                    <View style={styles.raceInfoText}>
                      <Text style={styles.raceName}>{race.name}</Text>
                      <Text style={styles.raceDate}>
                        {new Date(race.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                      {circuit && <Text style={styles.raceCircuit}>{circuit.name}</Text>}
                    </View>
                  </View>
                  {winner && (
                    <View style={styles.raceWinner}>
                      <Text style={styles.raceWinnerLabel}>WINNER</Text>
                      <Text style={styles.raceWinnerName}>{winner.shortName}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {activeTab === "circuits" &&
          CIRCUITS.map((circuit) => (
            <TouchableOpacity
              key={circuit.id}
              style={styles.circuitCard}
              onPress={() => router.push({ pathname: "/circuit/[id]", params: { id: circuit.id } })}
              activeOpacity={0.85}
            >
              <View style={styles.circuitLeft}>
                <Text style={styles.circuitFlag}>{circuit.flag}</Text>
                <View style={styles.circuitInfo}>
                  <Text style={styles.circuitName}>{circuit.name}</Text>
                  <Text style={styles.circuitLocation}>{circuit.location}, {circuit.country}</Text>
                  <View style={styles.circuitStats}>
                    <Text style={styles.circuitStatItem}>{circuit.laps} laps</Text>
                    <Text style={styles.circuitStatDot}>·</Text>
                    <Text style={styles.circuitStatItem}>{circuit.length} km</Text>
                    <Text style={styles.circuitStatDot}>·</Text>
                    <Text style={styles.circuitStatItem}>{circuit.corners} corners</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.circuitTypeBadge, circuit.type === "street" && styles.circuitTypeStreet]}>
                <Text style={styles.circuitTypeText}>{circuit.type.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))}

        {activeTab === "teams" &&
          teamsData.slice().sort((a, b) => a.position - b.position).map((team) => (
            <TouchableOpacity
              key={team.id}
              style={styles.teamCard}
              onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[team.color + "22", "transparent"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 0 }}
              />
              <View style={[styles.teamColorBar, { backgroundColor: team.color }]} />
              <View style={styles.teamInfo}>
                <Text style={styles.teamPos}>P{team.position}</Text>
                <View style={styles.teamInfoText}>
                  <Text style={styles.teamName}>{team.shortName}</Text>
                  <Text style={styles.teamBase}>{team.base}</Text>
                  <Text style={styles.teamPU}>{team.powerUnit} Power Unit</Text>
                </View>
              </View>
              <View style={styles.teamRight}>
                <Text style={styles.teamPoints}>{team.points}</Text>
                <Text style={styles.teamPointsLabel}>PTS</Text>
              </View>
            </TouchableOpacity>
          ))}

        <TouchableOpacity
          style={styles.settingsCard}
          onPress={() => router.push("/settings")}
          activeOpacity={0.85}
        >
          <View style={styles.settingsIcon}>
            <Ionicons name="language" size={20} color={Colors.red} />
          </View>
          <View style={styles.settingsInfo}>
            <Text style={styles.settingsTitle}>Language / Settings</Text>
            <Text style={styles.settingsSubtitle}>Change language, notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.white, letterSpacing: 2, marginBottom: 2 },
  screenSeason: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 14 },
  tabRow: { flexDirection: "row" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: Colors.red },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textTertiary, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.white },
  loadingContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  raceCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  raceCardLive: { borderColor: Colors.red + "66" },
  raceCardCompleted: { opacity: 0.75 },
  raceRound: { width: 28, alignItems: "center", gap: 3 },
  raceRoundNum: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textTertiary },
  raceLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.red },
  raceInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  raceFlag: { fontSize: 24 },
  raceInfoText: { flex: 1 },
  raceName: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.white, marginBottom: 2 },
  raceDate: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginBottom: 1 },
  raceCircuit: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary },
  raceWinner: { alignItems: "flex-end" },
  raceWinnerLabel: { fontFamily: "Inter_500Medium", fontSize: 7, color: Colors.textTertiary, letterSpacing: 1, marginBottom: 2 },
  raceWinnerName: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#FFD700" },
  raceLiveBadge: { backgroundColor: Colors.red, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  raceLiveBadgeText: { fontFamily: "Inter_700Bold", fontSize: 8, color: "#fff", letterSpacing: 1 },
  raceUpcomingBadge: { backgroundColor: Colors.border, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  raceUpcomingText: { fontFamily: "Inter_600SemiBold", fontSize: 7, color: Colors.textTertiary, letterSpacing: 0.5 },
  sessionList: {
    marginTop: -4,
    marginBottom: 4,
    marginLeft: 28,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  sessionLoading: { paddingVertical: 16, alignItems: "center" },
  sessionEmptyText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "44",
  },
  sessionRowActive: { backgroundColor: Colors.red + "11" },
  sessionInfo: { flex: 1 },
  sessionName: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.white, marginBottom: 1 },
  sessionTime: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
  sessionLiveBadge: { backgroundColor: Colors.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sessionLiveText: { fontFamily: "Inter_700Bold", fontSize: 7, color: "#fff", letterSpacing: 1 },
  circuitCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  circuitLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  circuitFlag: { fontSize: 24 },
  circuitInfo: { flex: 1 },
  circuitName: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.white, marginBottom: 2 },
  circuitLocation: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginBottom: 3 },
  circuitStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  circuitStatItem: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary },
  circuitStatDot: { color: Colors.textTertiary, fontSize: 9 },
  circuitTypeBadge: { backgroundColor: "#1A1A1A", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  circuitTypeStreet: { borderColor: "#FF800055", backgroundColor: "#FF800011" },
  circuitTypeText: { fontFamily: "Inter_600SemiBold", fontSize: 7, color: Colors.textSecondary, letterSpacing: 0.5 },
  teamCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamColorBar: { width: 3, height: 36, borderRadius: 2 },
  teamInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  teamPos: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textTertiary, width: 28 },
  teamInfoText: { flex: 1 },
  teamName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white, marginBottom: 2 },
  teamBase: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginBottom: 1 },
  teamPU: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary },
  teamRight: { alignItems: "flex-end" },
  teamPoints: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  teamPointsLabel: { fontFamily: "Inter_500Medium", fontSize: 7, color: Colors.textTertiary, letterSpacing: 1 },
  learnCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  learnCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  learnCardTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.white, letterSpacing: 1.5, marginBottom: 2 },
  learnCardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.red + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsInfo: { flex: 1 },
  settingsTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white, marginBottom: 2 },
  settingsSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
});
