import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { DRIVERS, getTeam, Driver } from "@/constants/f1Data";

const COMPARE_STATS = [
  { key: "points", label: "POINTS" },
  { key: "wins", label: "WINS" },
  { key: "podiums", label: "PODIUMS" },
  { key: "poles", label: "POLE POSITIONS" },
  { key: "fastestLaps", label: "FASTEST LAPS" },
  { key: "grandsPrix", label: "GRANDS PRIX" },
  { key: "championships", label: "CHAMPIONSHIPS" },
];

function AnimatedBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? value / maxValue : 0;
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withTiming(pct, { duration: 600 });
  }, [pct]);
  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));
  return (
    <View style={styles.barBg}>
      <Animated.View style={[styles.barFill, style, { backgroundColor: color }]} />
    </View>
  );
}

function DriverSelector({ selected, onSelect, side }: { selected: Driver | null; onSelect: (d: Driver) => void; side: "left" | "right" }) {
  const [visible, setVisible] = useState(false);
  const team = selected ? getTeam(selected.teamId) : null;

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorBtn, side === "right" && styles.selectorBtnRight]}
        onPress={() => setVisible(true)}
        activeOpacity={0.85}
      >
        {selected ? (
          <LinearGradient
            colors={[team?.color + "33" || "#33333333", "#1A1A1A"]}
            style={styles.selectorContent}
          >
            <Text style={[styles.selectorNumber, { color: team?.color }]}>{selected.number}</Text>
            <Text style={styles.selectorFirstName}>{selected.firstName}</Text>
            <Text style={styles.selectorLastName}>{selected.lastName.toUpperCase()}</Text>
            <Text style={styles.selectorTeam}>{team?.shortName}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.selectorEmpty}>
            <Ionicons name="add-circle-outline" size={32} color={Colors.textSecondary} />
            <Text style={styles.selectorEmptyText}>Select Driver</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>SELECT DRIVER</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DRIVERS.sort((a, b) => a.position - b.position)}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => {
              const t = getTeam(item.teamId);
              return (
                <TouchableOpacity
                  style={styles.driverOption}
                  onPress={() => { onSelect(item); setVisible(false); }}
                >
                  <View style={[styles.driverOptionBar, { backgroundColor: t?.color || "#555" }]} />
                  <Text style={[styles.driverOptionNum, { color: t?.color }]}>{item.number}</Text>
                  <View style={styles.driverOptionInfo}>
                    <Text style={styles.driverOptionName}>{item.name}</Text>
                    <Text style={styles.driverOptionTeam}>{t?.shortName}</Text>
                  </View>
                  <Text style={styles.driverOptionPts}>{item.points} pts</Text>
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}

export default function CompareScreen() {
  const params = useLocalSearchParams<{ driverA?: string; driverB?: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const initialA = params.driverA ? DRIVERS.find((d) => d.id === params.driverA) || null : null;
  const initialB = params.driverB ? DRIVERS.find((d) => d.id === params.driverB) || null : null;

  const [driverA, setDriverA] = useState<Driver | null>(initialA);
  const [driverB, setDriverB] = useState<Driver | null>(initialB);

  const teamA = driverA ? getTeam(driverA.teamId) : null;
  const teamB = driverB ? getTeam(driverB.teamId) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>DRIVER COMPARISON</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 100 }}>
        {/* Selector Row */}
        <View style={styles.selectorRow}>
          <DriverSelector selected={driverA} onSelect={setDriverA} side="left" />
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <DriverSelector selected={driverB} onSelect={setDriverB} side="right" />
        </View>

        {/* Comparison Stats */}
        {driverA && driverB ? (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>HEAD TO HEAD</Text>
            {COMPARE_STATS.map((stat) => {
              const valA = (driverA as any)[stat.key] as number;
              const valB = (driverB as any)[stat.key] as number;
              const maxVal = Math.max(valA, valB, 1);
              const aWins = valA > valB;
              const bWins = valB > valA;

              return (
                <View key={stat.key} style={styles.statRow}>
                  <View style={styles.statLeft}>
                    <Text style={[styles.statValA, aWins && styles.statWinner, aWins && { color: teamA?.color || Colors.white }]}>
                      {valA}
                    </Text>
                    <AnimatedBar value={valA} maxValue={maxVal} color={teamA?.color || Colors.red} />
                  </View>
                  <View style={styles.statCenter}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    {aWins && <View style={[styles.winIndicator, { borderColor: teamA?.color || Colors.white }]} />}
                    {bWins && <View style={[styles.winIndicator, styles.winIndicatorRight, { borderColor: teamB?.color || Colors.white }]} />}
                  </View>
                  <View style={styles.statRight}>
                    <AnimatedBar value={valB} maxValue={maxVal} color={teamB?.color || Colors.red} />
                    <Text style={[styles.statValB, bWins && styles.statWinner, bWins && { color: teamB?.color || Colors.white }]}>
                      {valB}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Season Points Comparison */}
            <Text style={[styles.statsTitle, { marginTop: 24 }]}>2026 POINTS PER RACE</Text>
            <View style={styles.chartCard}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: teamA?.color }]} />
                  <Text style={styles.legendText}>{driverA.shortName}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: teamB?.color }]} />
                  <Text style={styles.legendText}>{driverB.shortName}</Text>
                </View>
              </View>
              <View style={styles.doubleBarChart}>
                {driverA.seasonPoints.map((ptsA, i) => {
                  const ptsB = driverB.seasonPoints[i] || 0;
                  const maxP = Math.max(ptsA, ptsB, 1);
                  return (
                    <View key={i} style={styles.doubleBarCol}>
                      <View style={styles.doubleBarsRow}>
                        <View style={[styles.singleBarBg, { backgroundColor: Colors.border }]}>
                          <View style={[styles.singleBarFill, { height: `${(ptsA / maxP) * 100}%`, backgroundColor: teamA?.color || Colors.red }]} />
                        </View>
                        <View style={[styles.singleBarBg, { backgroundColor: Colors.border }]}>
                          <View style={[styles.singleBarFill, { height: `${(ptsB / maxP) * 100}%`, backgroundColor: teamB?.color || "#888" }]} />
                        </View>
                      </View>
                      <Text style={styles.barLabel}>{i + 1}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="git-compare-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Select Two Drivers</Text>
            <Text style={styles.emptySubtitle}>Choose drivers above to see a head-to-head comparison</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white, letterSpacing: 2 },
  selectorRow: { flexDirection: "row", padding: 16, gap: 12, alignItems: "stretch" },
  selectorBtn: { flex: 1, minHeight: 140, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  selectorBtnRight: {},
  selectorContent: { flex: 1, padding: 14, justifyContent: "flex-end" },
  selectorNumber: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 2 },
  selectorFirstName: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  selectorLastName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white, marginBottom: 4 },
  selectorTeam: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  selectorEmpty: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.card, gap: 8 },
  selectorEmptyText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  vsContainer: { width: 36, alignItems: "center", justifyContent: "center" },
  vsText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.red, letterSpacing: 1 },
  statsContainer: { paddingHorizontal: 16 },
  statsTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 16 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  statLeft: { flex: 1, alignItems: "flex-end", gap: 4 },
  statRight: { flex: 1, gap: 4 },
  statCenter: { width: 110, alignItems: "center" },
  statValA: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary, textAlign: "right" },
  statValB: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
  statWinner: { color: Colors.white },
  statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.textSecondary, letterSpacing: 1, textAlign: "center", marginBottom: 4 },
  winIndicator: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5 },
  winIndicatorRight: {},
  barBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, width: "100%" },
  barFill: { height: 4, borderRadius: 2 },
  chartCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  chartLegend: { flexDirection: "row", gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  doubleBarChart: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4 },
  doubleBarCol: { flex: 1, alignItems: "center", height: "100%" },
  doubleBarsRow: { flex: 1, flexDirection: "row", gap: 2, width: "100%" },
  singleBarBg: { flex: 1, justifyContent: "flex-end", borderRadius: 2 },
  singleBarFill: { width: "100%", borderRadius: 2 },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 7, color: Colors.textTertiary, marginTop: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, textAlign: "center" },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white, letterSpacing: 2 },
  driverOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  driverOptionBar: { width: 3, height: 36, borderRadius: 2 },
  driverOptionNum: { fontFamily: "Inter_700Bold", fontSize: 18, width: 32, textAlign: "center" },
  driverOptionInfo: { flex: 1 },
  driverOptionName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white, marginBottom: 2 },
  driverOptionTeam: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  driverOptionPts: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
});
