import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { getDriver, getTeam, RACES_2026 } from "@/constants/f1Data";
import { getDriverPhotoHighRes } from "@/constants/driverPhotos";
import { useDriverStandings } from "@/hooks/useF1Data";
import { useFavorites } from "@/context/FavoritesContext";

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  return (
    <View style={styles.barChart}>
      {data.map((val, i) => (
        <View key={i} style={styles.barChartCol}>
          <View style={styles.barChartBarBg}>
            <View style={[styles.barChartBarFill, { height: `${(val / maxVal) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.barChartLabel}>{i + 1}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isFavoriteDriver, toggleFavoriteDriver } = useFavorites();
  const [activeTab, setActiveTab] = useState<"stats" | "results" | "bio">("stats");

  const { data: apiDrivers } = useDriverStandings();
  const driver = apiDrivers?.find((d) => d.id === id) || getDriver(id);
  const team = driver ? getTeam(driver.teamId) : null;
  const isFav = driver ? isFavoriteDriver(driver.id) : false;

  if (!driver || !team) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Driver not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const maxPoints = Math.max(...driver.seasonPoints, 1);

  const completedRaces = RACES_2026.filter((r) => r.status === "completed" && r.results);
  const driverResults = completedRaces.map((r) => {
    const result = r.results?.find((res) => res.driverId === driver.id);
    return result ? { race: r, result } : null;
  }).filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={[styles.hero, { paddingTop: topPadding }]}>
        <LinearGradient
          colors={[team.color + "BB", team.color + "44", "rgba(10,10,10,0.95)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {getDriverPhotoHighRes(driver.id) && (
          <Image
            source={getDriverPhotoHighRes(driver.id)!}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(10,10,10,0.9)"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.heroNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleFavoriteDriver(driver.id)}
            style={styles.navBtn}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? Colors.red : Colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroFlag}>{driver.flag}</Text>
            <Text style={styles.heroNationality}>{driver.nationality}</Text>
            <Text style={styles.heroFirstName}>{driver.firstName}</Text>
            <Text style={styles.heroLastName}>{driver.lastName.toUpperCase()}</Text>
            <View style={[styles.heroTeamBadge, { backgroundColor: team.color + "33", borderColor: team.color }]}>
              <Text style={[styles.heroTeamName, { color: team.color }]}>{team.shortName}</Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            <Text style={[styles.heroNumber, { color: team.color + "44" }]}>{driver.number}</Text>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>P{driver.position}</Text>
            <Text style={styles.quickStatLabel}>WDC</Text>
          </View>
          <View style={styles.quickStatDiv} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{driver.points}</Text>
            <Text style={styles.quickStatLabel}>POINTS</Text>
          </View>
          <View style={styles.quickStatDiv} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{driver.wins}</Text>
            <Text style={styles.quickStatLabel}>WINS</Text>
          </View>
          <View style={styles.quickStatDiv} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{driver.championships > 0 ? driver.championships : "—"}</Text>
            <Text style={styles.quickStatLabel}>TITLES</Text>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["stats", "results", "bio"] as const).map((t) => (
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }}
      >
        {activeTab === "stats" && (
          <View style={styles.statsSection}>
            {/* Career Stats */}
            <Text style={styles.sectionTitle}>CAREER STATISTICS</Text>
            <View style={styles.statGrid}>
              <StatBlock label="GRANDS PRIX" value={driver.grandsPrix} />
              <StatBlock label="WINS" value={driver.wins} />
              <StatBlock label="PODIUMS" value={driver.podiums} />
              <StatBlock label="POLE POSITIONS" value={driver.poles} />
              <StatBlock label="FASTEST LAPS" value={driver.fastestLaps} />
              <StatBlock label="CHAMPIONSHIPS" value={driver.championships || "—"} />
            </View>

            {/* Points Chart */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2026 POINTS PER RACE</Text>
            <View style={styles.chartCard}>
              <BarChart data={driver.seasonPoints} maxVal={maxPoints} color={team.color} />
            </View>

            {/* Age & Personal */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PROFILE</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Number</Text>
                <Text style={styles.profileValue}>#{driver.number}</Text>
              </View>
              <View style={styles.profileRowDiv} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Nationality</Text>
                <Text style={styles.profileValue}>{driver.nationality} {driver.flag}</Text>
              </View>
              <View style={styles.profileRowDiv} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Age</Text>
                <Text style={styles.profileValue}>{driver.age}</Text>
              </View>
              <View style={styles.profileRowDiv} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Team</Text>
                <Text style={[styles.profileValue, { color: team.color }]}>{team.name}</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "results" && (
          <View>
            <Text style={styles.sectionTitle}>2026 RACE RESULTS</Text>
            {driverResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No results yet</Text>
              </View>
            ) : (
              driverResults.map((item) => {
                if (!item) return null;
                const { race, result } = item;
                return (
                  <View key={race.id} style={styles.resultRow}>
                    <View style={styles.resultPos}>
                      <Text style={[styles.resultPosText, result.position === 1 && { color: "#FFD700" }]}>
                        P{result.position}
                      </Text>
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultRaceName}>{race.flag} {race.name}</Text>
                      <Text style={styles.resultTime}>{result.time || result.gap}</Text>
                    </View>
                    <View style={styles.resultPoints}>
                      <Text style={styles.resultPtsVal}>{result.points}</Text>
                      <Text style={styles.resultPtsLabel}>PTS</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === "bio" && (
          <View>
            <Text style={styles.sectionTitle}>ABOUT {driver.lastName.toUpperCase()}</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{driver.bio}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  errorContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 18, color: Colors.white, marginBottom: 12 },
  backLink: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.red },
  hero: { paddingHorizontal: 16, paddingBottom: 20, overflow: "hidden" },
  heroPhoto: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "55%",
    opacity: 0.45,
  },
  heroNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 },
  heroLeft: { flex: 1 },
  heroRight: { justifyContent: "center" },
  heroFlag: { fontSize: 28, marginBottom: 4 },
  heroNationality: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  heroFirstName: { fontFamily: "Inter_400Regular", fontSize: 18, color: "rgba(255,255,255,0.8)", marginBottom: 0 },
  heroLastName: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.white, letterSpacing: 1, marginBottom: 10 },
  heroTeamBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  heroTeamName: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.5 },
  heroNumber: { fontFamily: "Inter_700Bold", fontSize: 80, lineHeight: 80, letterSpacing: -4 },
  quickStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickStat: { flex: 1, alignItems: "center" },
  quickStatDiv: { width: 1, backgroundColor: Colors.border },
  quickStatValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white, marginBottom: 3 },
  quickStatLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1.5 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: Colors.red },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.white },
  statsSection: {},
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBlock: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white, marginBottom: 2 },
  statSub: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1, textAlign: "center", marginTop: 4 },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barChart: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4 },
  barChartCol: { flex: 1, alignItems: "center", height: "100%" },
  barChartBarBg: { flex: 1, width: "100%", justifyContent: "flex-end", borderRadius: 3, backgroundColor: Colors.border + "66" },
  barChartBarFill: { width: "100%", borderRadius: 3 },
  barChartLabel: { fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.textTertiary, marginTop: 4 },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  profileRowDiv: { height: 1, backgroundColor: Colors.border },
  profileLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  profileValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultPos: { width: 40, alignItems: "center" },
  resultPosText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  resultInfo: { flex: 1 },
  resultRaceName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white, marginBottom: 3 },
  resultTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  resultPoints: { alignItems: "flex-end" },
  resultPtsVal: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  resultPtsLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  bioCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
