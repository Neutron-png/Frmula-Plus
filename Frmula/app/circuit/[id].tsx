import React from "react";
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
import { getCircuit, RACES_2026, getDriver } from "@/constants/f1Data";

export default function CircuitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const circuit = getCircuit(id);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!circuit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Circuit not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
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

  const race = RACES_2026.find((r) => r.circuitId === circuit.id);
  const raceWinner = race?.winner ? getDriver(race.winner) : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[typeColor + "44", typeColor + "11", "#0A0A0A"]}
        style={[styles.hero, { paddingTop: topPadding }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }}
      >
        {/* Key Stats */}
        <Text style={styles.sectionTitle}>CIRCUIT STATISTICS</Text>
        <View style={styles.statsGrid}>
          {[
            { label: "RACE LAPS", value: circuit.laps },
            { label: "CIRCUIT LENGTH", value: `${circuit.length}km` },
            { label: "CORNERS", value: circuit.corners },
            { label: "DRS ZONES", value: circuit.drsZones },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statBoxValue}>{s.value}</Text>
              <Text style={styles.statBoxLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Lap Record */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>LAP RECORD</Text>
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
              <Text style={styles.lapRecordLabel}>LAP RECORD</Text>
            </View>
          </LinearGradient>
        </View>

        {/* 2026 Race Info */}
        {race && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2026 RACE</Text>
            <View style={styles.raceCard}>
              <View style={styles.raceCardHeader}>
                <Text style={styles.raceCardName}>{race.flag} {race.name}</Text>
                <View style={[styles.statusBadge,
                  race.status === "live" ? styles.statusLive :
                    race.status === "completed" ? styles.statusCompleted : styles.statusUpcoming
                ]}>
                  <Text style={styles.statusText}>
                    {race.status === "live" ? "LIVE" : race.status === "completed" ? "FINISHED" : "UPCOMING"}
                  </Text>
                </View>
              </View>
              <Text style={styles.raceDate}>
                {new Date(race.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </Text>
              {race.status === "completed" && raceWinner && (
                <View style={styles.raceWinnerRow}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={styles.raceWinner}>{raceWinner.name}</Text>
                  {race.winnerTime && <Text style={styles.raceWinnerTime}>{race.winnerTime}</Text>}
                </View>
              )}
              {race.status === "completed" && race.results && (
                <View style={styles.raceResults}>
                  <Text style={styles.resultsHeader}>TOP RESULTS</Text>
                  {race.results.slice(0, 5).map((r) => {
                    const d = getDriver(r.driverId);
                    return (
                      <TouchableOpacity
                        key={r.driverId}
                        style={styles.resultRow}
                        onPress={() => router.push({ pathname: "/driver/[id]", params: { id: r.driverId } })}
                      >
                        <Text style={[styles.resultPos, r.position === 1 && { color: "#FFD700" }]}>P{r.position}</Text>
                        <Text style={styles.resultDriver}>{d?.name}</Text>
                        <Text style={styles.resultGap}>{r.gap}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* Description */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ABOUT THE CIRCUIT</Text>
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
  hero: { paddingHorizontal: 16, paddingBottom: 24 },
  heroNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  typeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  heroFlag: { fontSize: 40, marginBottom: 8 },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white, lineHeight: 28, marginBottom: 6 },
  heroLocation: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  heroFirstGP: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
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
  raceCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  raceCardName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusLive: { backgroundColor: Colors.red },
  statusCompleted: { backgroundColor: Colors.border },
  statusUpcoming: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.white, letterSpacing: 1 },
  raceDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  raceWinnerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  raceWinner: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white },
  raceWinnerTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  raceResults: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  resultsHeader: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 10 },
  resultPos: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textSecondary, width: 28 },
  resultDriver: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.white },
  resultGap: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  descriptionCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  descriptionText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
