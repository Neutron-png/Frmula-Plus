import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { DRIVERS, TEAMS, CIRCUITS, getTeam } from "@/constants/f1Data";
import { useFavorites } from "@/context/FavoritesContext";

type ResultItem = {
  type: "driver" | "team" | "circuit";
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  flag?: string;
};

function buildResults(query: string): ResultItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();

  const driverResults: ResultItem[] = DRIVERS.filter(
    (d) => d.name.toLowerCase().includes(q) || d.shortName.toLowerCase().includes(q) || d.nationality.toLowerCase().includes(q)
  ).map((d) => {
    const team = getTeam(d.teamId);
    return {
      type: "driver",
      id: d.id,
      title: d.name,
      subtitle: `${team?.shortName || ""} · P${d.position} · ${d.points} pts`,
      accent: team?.color || Colors.red,
      flag: d.flag,
    };
  });

  const teamResults: ResultItem[] = TEAMS.filter(
    (t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q) || t.base.toLowerCase().includes(q)
  ).map((t) => ({
    type: "team",
    id: t.id,
    title: t.shortName,
    subtitle: `${t.base} · P${t.position} WCC · ${t.points} pts`,
    accent: t.color,
  }));

  const circuitResults: ResultItem[] = CIRCUITS.filter(
    (c) => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  ).map((c) => ({
    type: "circuit",
    id: c.id,
    title: c.name,
    subtitle: `${c.location}, ${c.country} · ${c.laps} laps`,
    accent: "#3671C6",
    flag: c.flag,
  }));

  return [...driverResults, ...teamResults, ...circuitResults];
}

const TYPE_ICONS: Record<string, string> = {
  driver: "person",
  team: "shield",
  circuit: "map",
};

const TYPE_LABELS: Record<string, string> = {
  driver: "DRIVER",
  team: "TEAM",
  circuit: "CIRCUIT",
};

function ResultRow({ item, onPress }: { item: ResultItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.resultIcon, { backgroundColor: item.accent + "22" }]}>
        {item.flag ? (
          <Text style={styles.resultFlag}>{item.flag}</Text>
        ) : (
          <Ionicons name={TYPE_ICONS[item.type] as any} size={18} color={item.accent} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={[styles.typeBadge, { backgroundColor: item.accent + "22" }]}>
        <Text style={[styles.typeLabel, { color: item.accent }]}>{TYPE_LABELS[item.type]}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useFavorites();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const r = buildResults(query);
    setResults(r);
  }, [query]);

  const handleSelect = (item: ResultItem) => {
    if (query) addRecentSearch(query);
    if (item.type === "driver") router.push({ pathname: "/driver/[id]", params: { id: item.id } });
    else if (item.type === "team") router.push({ pathname: "/team/[id]", params: { id: item.id } });
    else if (item.type === "circuit") router.push({ pathname: "/circuit/[id]", params: { id: item.id } });
  };

  const handleRecentPress = (search: string) => {
    setQuery(search);
  };

  const groupedResults = results.reduce<Record<string, ResultItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const categorized = [
    ...(groupedResults["driver"] ? [{ type: "header", label: "DRIVERS" }, ...groupedResults["driver"].map(r => ({ type: "item" as const, data: r }))] : []),
    ...(groupedResults["team"] ? [{ type: "header", label: "TEAMS" }, ...groupedResults["team"].map(r => ({ type: "item" as const, data: r }))] : []),
    ...(groupedResults["circuit"] ? [{ type: "header", label: "CIRCUITS" }, ...groupedResults["circuit"].map(r => ({ type: "item" as const, data: r }))] : []),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Search Bar */}
      <View style={[styles.searchHeader, { paddingTop: topPadding + 8 }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Drivers, teams, circuits..."
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => query && addRecentSearch(query)}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={categorized}
        keyExtractor={(item, idx) => item.type === "header" ? `header-${idx}` : `item-${item.data?.id}-${idx}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        ListHeaderComponent={
          !query ? (
            <View style={styles.recentContainer}>
              {recentSearches.length > 0 ? (
                <>
                  <View style={styles.recentHeader}>
                    <Text style={styles.recentTitle}>RECENT SEARCHES</Text>
                    <TouchableOpacity onPress={clearRecentSearches}>
                      <Text style={styles.clearBtn}>CLEAR</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((s) => (
                    <TouchableOpacity key={s} style={styles.recentItem} onPress={() => handleRecentPress(s)}>
                      <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.recentText}>{s}</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={52} color={Colors.textTertiary} />
                  <Text style={styles.emptyTitle}>Search FRMULA+</Text>
                  <Text style={styles.emptySubtitle}>Find drivers, teams, and circuits instantly</Text>
                </View>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          query ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.noResultsText}>No results for "{query}"</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return <Text style={styles.categoryHeader}>{item.label}</Text>;
          }
          return <ResultRow item={item.data!} onPress={() => handleSelect(item.data!)} />;
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.white, fontFamily: "Inter_400Regular", fontSize: 15 },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.red },
  recentContainer: { padding: 16 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  recentTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2 },
  clearBtn: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.red, letterSpacing: 1 },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.white },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  categoryHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  resultFlag: { fontSize: 18 },
  resultInfo: { flex: 1 },
  resultTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white, marginBottom: 2 },
  resultSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  typeLabel: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  noResults: { alignItems: "center", paddingVertical: 48, gap: 12 },
  noResultsText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
});
