import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { getTeam, getDriver, RACES_2026 } from "@/constants/f1Data";
import { useFavorites } from "@/context/FavoritesContext";

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isFavoriteTeam, toggleFavoriteTeam } = useFavorites();
  const [activeTab, setActiveTab] = useState<"overview" | "drivers" | "results">("overview");

  const team = getTeam(id);
  const isFav = team ? isFavoriteTeam(team.id) : false;

  if (!team) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Team not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const teamDrivers = team.drivers.map((id) => getDriver(id)).filter(Boolean);

  const completedRaces = RACES_2026.filter((r) => r.status === "completed" && r.results);
  const teamResults = completedRaces.map((r) => {
    const results = r.results?.filter((res) => team.drivers.includes(res.driverId));
    return results?.length ? { race: r, results } : null;
  }).filter(Boolean);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[team.color + "66", team.color + "11", "#0A0A0A"]}
        style={[styles.hero, { paddingTop: topPadding }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleFavoriteTeam(team.id)} style={styles.navBtn}>
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? Colors.red : Colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.teamColorBar, { backgroundColor: team.color }]} />
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamBase}>{team.base} · Est. {team.firstEntry}</Text>
        <Text style={styles.powerUnit}>{team.powerUnit} Power Unit</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>P{team.position}</Text>
            <Text style={styles.heroStatLabel}>WCC</Text>
          </View>
          <View style={styles.heroStatDiv} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{team.points}</Text>
            <Text style={styles.heroStatLabel}>POINTS</Text>
          </View>
          <View style={styles.heroStatDiv} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{team.wins}</Text>
            <Text style={styles.heroStatLabel}>WINS</Text>
          </View>
          <View style={styles.heroStatDiv} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{team.championships}</Text>
            <Text style={styles.heroStatLabel}>WCC TITLES</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        {(["overview", "drivers", "results"] as const).map((t) => (
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
        {activeTab === "overview" && (
          <View>
            <Text style={styles.sectionTitle}>ABOUT THE TEAM</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{team.bio}</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>SEASON STATISTICS</Text>
            <View style={styles.statsGrid}>
              {[
                { label: "PODIUMS", value: team.podiums },
                { label: "POLE POSITIONS", value: team.poles },
                { label: "WINS", value: team.wins },
                { label: "CHAMPIONSHIPS", value: team.championships },
              ].map((s) => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={styles.statBoxValue}>{s.value}</Text>
                  <Text style={styles.statBoxLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "drivers" && (
          <View>
            <Text style={styles.sectionTitle}>2026 DRIVER LINEUP</Text>
            {teamDrivers.map((driver) => {
              if (!driver) return null;
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.driverCard}
                  onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.driverCardLeft}>
                    <Text style={[styles.driverNum, { color: team.color }]}>{driver.number}</Text>
                    <Text style={styles.driverFlag}>{driver.flag}</Text>
                  </View>
                  <View style={styles.driverCardInfo}>
                    <Text style={styles.driverCardName}>{driver.name}</Text>
                    <Text style={styles.driverCardNat}>{driver.nationality}</Text>
                    <View style={styles.driverCardStats}>
                      <Text style={styles.driverCardStat}>P{driver.position} WDC</Text>
                      <Text style={styles.driverCardStatDot}>·</Text>
                      <Text style={styles.driverCardStat}>{driver.points} pts</Text>
                      <Text style={styles.driverCardStatDot}>·</Text>
                      <Text style={styles.driverCardStat}>{driver.wins} wins</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>DRIVER COMPARISON</Text>
            {teamDrivers.length >= 2 && (
              <TouchableOpacity
                style={styles.compareBtn}
                onPress={() => router.push({
                  pathname: "/compare",
                  params: { driverA: team.drivers[0], driverB: team.drivers[1] }
                })}
              >
                <Ionicons name="git-compare" size={18} color={Colors.white} />
                <Text style={styles.compareBtnText}>Compare {getDriver(team.drivers[0])?.lastName} vs {getDriver(team.drivers[1])?.lastName}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === "results" && (
          <View>
            <Text style={styles.sectionTitle}>2026 RACE RESULTS</Text>
            {teamResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No results yet</Text>
              </View>
            ) : (
              teamResults.map((item) => {
                if (!item) return null;
                const { race, results } = item;
                return (
                  <View key={race.id} style={styles.raceResult}>
                    <Text style={styles.raceResultName}>{race.flag} {race.name}</Text>
                    {results.map((r) => {
                      const d = getDriver(r.driverId);
                      return (
                        <View key={r.driverId} style={styles.raceResultRow}>
                          <Text style={[styles.raceResultPos, r.position === 1 && { color: "#FFD700" }]}>P{r.position}</Text>
                          <Text style={styles.raceResultDriver}>{d?.shortName}</Text>
                          <Text style={styles.raceResultPts}>{r.points} pts</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
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
  hero: { paddingHorizontal: 16, paddingBottom: 20 },
  heroNav: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  teamColorBar: { width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  teamName: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.white, marginBottom: 4, lineHeight: 32 },
  teamBase: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  powerUnit: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary, marginBottom: 16 },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatDiv: { width: 1, backgroundColor: Colors.border },
  heroStatValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white, marginBottom: 3 },
  heroStatLabel: { fontFamily: "Inter_500Medium", fontSize: 8, color: Colors.textSecondary, letterSpacing: 1, textAlign: "center" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: Colors.red },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.white },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  bioCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBoxValue: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.white, marginBottom: 4 },
  statBoxLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1, textAlign: "center" },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverCardLeft: { alignItems: "center", width: 44 },
  driverNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  driverFlag: { fontSize: 16, marginTop: 2 },
  driverCardInfo: { flex: 1 },
  driverCardName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white, marginBottom: 2 },
  driverCardNat: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  driverCardStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  driverCardStat: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  driverCardStatDot: { color: Colors.textTertiary },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.red,
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
  },
  compareBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  raceResult: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  raceResultName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white, marginBottom: 8 },
  raceResultRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  raceResultPos: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textSecondary, width: 30 },
  raceResultDriver: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white },
  raceResultPts: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
});
