import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { DRIVERS, TEAMS, getTeam, Driver } from "@/constants/f1Data";
import { getDriverPhoto } from "@/constants/driverPhotos";
import { useDriverStandings } from "@/hooks/useF1Data";
import { useOpenF1Drivers } from "@/hooks/useOpenF1";
import { useFavorites } from "@/context/FavoritesContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.92;

function DriverCard({ driver }: { driver: Driver }) {
  const team = getTeam(driver.teamId);
  const { isFavoriteDriver, toggleFavoriteDriver } = useFavorites();
  const isFav = isFavoriteDriver(driver.id);
  const { data: openF1Drivers } = useOpenF1Drivers();

  const headshotUri = useMemo(() => {
    if (openF1Drivers) {
      const of1 = openF1Drivers.find((d) => d.driver_number === driver.number);
      if (of1?.headshot_url) return { uri: of1.headshot_url.replace("/1col/", "/2col/") };
    }
    return getDriverPhoto(driver.id);
  }, [openF1Drivers, driver.number, driver.id]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
      activeOpacity={0.85}
      testID={`driver-card-${driver.id}`}
    >
      <View style={[styles.cardColorBar, { backgroundColor: team?.color }]} />
      {headshotUri ? (
        <Image
          source={headshotUri}
          style={styles.driverPhoto}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.driverPhotoPlaceholder}>
          <Text style={[styles.driverPhotoPlaceholderNum, { color: team?.color }]}>
            {driver.number}
          </Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardPos}>P{driver.position}</Text>
          <TouchableOpacity onPress={() => toggleFavoriteDriver(driver.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={14}
              color={isFav ? Colors.red : "rgba(255,255,255,0.25)"}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardLastName} numberOfLines={1}>{driver.lastName.toUpperCase()}</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardTeam} numberOfLines={1}>{team?.shortName}</Text>
          <Text style={styles.cardPts}>{driver.points}<Text style={styles.cardPtsLabel}> PTS</Text></Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const { data: apiDrivers } = useDriverStandings();
  const allDrivers = apiDrivers?.length ? apiDrivers : DRIVERS;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    return allDrivers.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.shortName.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter ? d.teamId === teamFilter : true;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => a.position - b.position);
  }, [search, teamFilter, allDrivers]);

  const renderItem = ({ item }: { item: Driver }) => <DriverCard driver={item} />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Text style={styles.screenTitle}>DRIVERS</Text>
        <Text style={styles.screenSeason}>2026 SEASON · {allDrivers.length} DRIVERS</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search drivers..."
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null as string | null, shortName: "ALL" }, ...TEAMS.map((t) => ({ id: t.id, shortName: t.shortName }))]}
          keyExtractor={(item) => item.id || "all"}
          contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
          renderItem={({ item }) => {
            const team = item.id ? TEAMS.find((t) => t.id === item.id) : null;
            const isActive = item.id === teamFilter;
            return (
              <TouchableOpacity
                onPress={() => setTeamFilter(item.id === teamFilter ? null : item.id)}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: team?.color || Colors.red, borderColor: team?.color || Colors.red },
                ]}
              >
                <Text style={[styles.filterText, isActive && { color: "#fff" }]}>{item.shortName}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No drivers found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.white, letterSpacing: 2, marginBottom: 2 },
  screenSeason: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.white },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.textSecondary, letterSpacing: 0.5 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
  },
  cardColorBar: {
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  driverPhoto: {
    width: CARD_HEIGHT * 0.7,
    height: CARD_HEIGHT - 2,
    position: "absolute",
    right: -4,
    bottom: 0,
    opacity: 0.35,
  },
  driverPhotoPlaceholder: {
    width: CARD_HEIGHT * 0.7,
    height: CARD_HEIGHT,
    position: "absolute",
    right: -4,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  driverPhotoPlaceholderNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    opacity: 0.08,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPos: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  cardLastName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTeam: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    flex: 1,
  },
  cardPts: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.white },
  cardPtsLabel: { fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.textSecondary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary },
});
