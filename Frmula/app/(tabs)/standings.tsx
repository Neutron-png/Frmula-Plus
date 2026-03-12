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
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { DRIVERS, TEAMS, getTeam, getDriver } from "@/constants/f1Data";
import { getDriverPhoto } from "@/constants/driverPhotos";
import { useDriverStandings, useConstructorStandings, useCompletedRounds } from "@/hooks/useF1Data";

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"drivers" | "constructors">("drivers");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { data: apiDrivers } = useDriverStandings();
  const { data: apiTeams } = useConstructorStandings();
  const { completed, total } = useCompletedRounds();

  const sortedDrivers = (apiDrivers?.length ? apiDrivers : DRIVERS).slice().sort((a, b) => a.position - b.position);
  const sortedTeams = (apiTeams?.length ? apiTeams : TEAMS).slice().sort((a, b) => a.position - b.position);
  const leaderPoints = sortedDrivers[0]?.points || 1;
  const leaderTeamPoints = sortedTeams[0]?.points || 1;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Text style={styles.screenTitle}>STANDINGS</Text>
        <Text style={styles.screenSeason}>2026 SEASON · {completed > 0 ? `${completed} OF ${total || 24}` : `${total || 24}`} ROUNDS</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "drivers" && styles.tabActive]}
            onPress={() => setActiveTab("drivers")}
          >
            <Text style={[styles.tabText, activeTab === "drivers" && styles.tabTextActive]}>DRIVERS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "constructors" && styles.tabActive]}
            onPress={() => setActiveTab("constructors")}
          >
            <Text style={[styles.tabText, activeTab === "constructors" && styles.tabTextActive]}>CONSTRUCTORS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
      >
        {activeTab === "drivers"
          ? sortedDrivers.map((driver) => {
              const team = getTeam(driver.teamId);
              const barWidth = (driver.points / leaderPoints) * 100;
              const isLeader = driver.position === 1;
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.driverCard, isLeader && styles.driverCardLeader]}
                  onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
                  activeOpacity={0.85}
                >
                  {isLeader && (
                    <LinearGradient
                      colors={[team?.color + "18" || "#18", "transparent"]}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <View style={styles.driverCardLeft}>
                    <Text style={[
                      styles.driverPos,
                      isLeader && { color: "#FFD700" },
                      driver.position <= 3 && !isLeader && { color: Colors.white },
                    ]}>
                      {driver.position}
                    </Text>
                    {getDriverPhoto(driver.id) ? (
                      <Image source={getDriverPhoto(driver.id)!} style={styles.driverCardPhoto} />
                    ) : (
                      <View style={[styles.driverCardPhotoPlaceholder, { backgroundColor: team?.color + "33" }]}>
                        <Text style={[styles.driverCardPhotoNum, { color: team?.color }]}>{driver.number}</Text>
                      </View>
                    )}
                    <View style={[styles.driverTeamBar, { backgroundColor: team?.color }]} />
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverShort}>{driver.shortName}</Text>
                      <Text style={styles.driverFullName}>{driver.name}</Text>
                      <View style={styles.driverBarWrap}>
                        <View style={[styles.driverBar, { width: `${barWidth}%` as any, backgroundColor: team?.color || Colors.red }]} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.driverCardRight}>
                    <Text style={[styles.driverPoints, isLeader && { color: "#FFD700" }]}>{driver.points}</Text>
                    <Text style={styles.driverPointsLabel}>PTS</Text>
                    {driver.position > 1 && (
                      <Text style={styles.driverGap}>
                        -{sortedDrivers[0].points - driver.points}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          : sortedTeams.map((team) => {
              const d1 = getDriver(team.drivers[0]);
              const d2 = team.drivers[1] ? getDriver(team.drivers[1]) : null;
              const barWidth = (team.points / leaderTeamPoints) * 100;
              const isLeader = team.position === 1;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.driverCard, isLeader && styles.driverCardLeader]}
                  onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
                  activeOpacity={0.85}
                >
                  {isLeader && (
                    <LinearGradient
                      colors={[team.color + "18", "transparent"]}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <View style={styles.driverCardLeft}>
                    <Text style={[styles.driverPos, isLeader && { color: "#FFD700" }, team.position <= 3 && !isLeader && { color: Colors.white }]}>
                      {team.position}
                    </Text>
                    <View style={[styles.teamColorSwatch, { backgroundColor: team.color }]}>
                      <Text style={styles.teamSwatchInitial}>{team.shortName[0]}</Text>
                    </View>
                    <View style={[styles.driverTeamBar, { backgroundColor: team.color }]} />
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverShort}>{team.shortName.toUpperCase()}</Text>
                      <Text style={styles.driverFullName}>{d1?.shortName}{d2 ? ` · ${d2.shortName}` : ""}</Text>
                      <View style={styles.driverBarWrap}>
                        <View style={[styles.driverBar, { width: `${barWidth}%` as any, backgroundColor: team.color }]} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.driverCardRight}>
                    <Text style={[styles.driverPoints, isLeader && { color: "#FFD700" }]}>{team.points}</Text>
                    <Text style={styles.driverPointsLabel}>PTS</Text>
                    {team.position > 1 && (
                      <Text style={styles.driverGap}>-{sortedTeams[0].points - team.points}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.white, letterSpacing: 2, marginBottom: 2 },
  screenSeason: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 16 },
  tabRow: { flexDirection: "row", gap: 0 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.red },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textTertiary, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.white },
  driverCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverCardLeader: { borderColor: "#FFD70044" },
  driverCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  driverPos: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textTertiary, width: 24, textAlign: "center" },
  driverCardPhoto: { width: 42, height: 42, borderRadius: 21 },
  driverCardPhotoPlaceholder: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  driverCardPhotoNum: { fontFamily: "Inter_700Bold", fontSize: 15 },
  driverTeamBar: { width: 3, height: 34, borderRadius: 2 },
  driverInfo: { flex: 1 },
  driverShort: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white, marginBottom: 1 },
  driverFullName: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginBottom: 6 },
  driverBarWrap: { height: 3, backgroundColor: Colors.border, borderRadius: 2 },
  driverBar: { height: "100%", borderRadius: 2 },
  driverCardRight: { alignItems: "flex-end", minWidth: 55 },
  driverPoints: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white },
  driverPointsLabel: { fontFamily: "Inter_500Medium", fontSize: 8, color: Colors.textTertiary, letterSpacing: 1.5 },
  driverGap: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  teamColorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  teamSwatchInitial: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
});
