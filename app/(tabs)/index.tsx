import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import {
  DRIVERS,
  getNextRace,
  getTeam,
  Driver,
} from "@/constants/f1Data";
import { getDriverPhoto } from "@/constants/driverPhotos";
import { useDriverStandings, useRaceCalendar, useCompletedRounds } from "@/hooks/useF1Data";
import { useOpenF1Meetings } from "@/hooks/useOpenF1";
import { getMeetingStatus, getCountryFlag } from "@/services/openf1";
import { useFavorites } from "@/context/FavoritesContext";
import { useTranslation } from "@/i18n";

const LOGO_FULL = require("@/assets/images/frmula-logo-full.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function LivePulse() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.2, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
  }, []);
  return <Animated.View style={[styles.liveDot, useAnimatedStyle(() => ({ opacity: opacity.value }))]} />;
}

function DriverHeroCard({ driver, rank }: { driver: Driver; rank: number }) {
  const team = getTeam(driver.teamId);
  const photo = getDriverPhoto(driver.id);

  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
      activeOpacity={0.92}
    >
      <LinearGradient
        colors={[team?.color + "CC" || "#333CC", team?.color + "44" || "#33344", "#000"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {photo && (
        <Image
          source={photo}
          style={styles.heroDriverPhoto}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={["transparent", "transparent", "rgba(0,0,0,0.85)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Text style={[styles.heroDriverBigNumber, { color: (team?.color || "#fff") + "33" }]}>
        {driver.number}
      </Text>
      <View style={styles.heroCardBottom}>
        <View style={[styles.heroTeamStripe, { backgroundColor: team?.color }]} />
        <Text style={styles.heroDriverFirstName}>{driver.firstName.toUpperCase()}</Text>
        <Text style={styles.heroDriverLastName}>{driver.lastName.toUpperCase()}</Text>
        <View style={styles.heroCardStats}>
          <View style={styles.heroCardStat}>
            <Text style={styles.heroCardStatVal}>P{driver.position}</Text>
            <Text style={styles.heroCardStatLabel}>WDC</Text>
          </View>
          <View style={styles.heroCardDivider} />
          <View style={styles.heroCardStat}>
            <Text style={styles.heroCardStatVal}>{driver.points}</Text>
            <Text style={styles.heroCardStatLabel}>PTS</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isFavoriteDriver } = useFavorites();
  const { data: apiDrivers } = useDriverStandings();
  const { data: calendar } = useRaceCalendar();
  const { completed, total } = useCompletedRounds();
  const { data: openF1Meetings } = useOpenF1Meetings();

  const allDrivers = apiDrivers?.length ? apiDrivers : DRIVERS;
  const nextRace = calendar?.find((r) => r.status === "upcoming") || getNextRace();

  const liveMeeting = openF1Meetings?.find((m) => getMeetingStatus(m) === "live");
  const recentMeeting = (() => {
    if (liveMeeting) return liveMeeting;
    if (!openF1Meetings) return undefined;
    const now = new Date();
    const recent = openF1Meetings.filter((m) => {
      const end = new Date(m.date_end);
      const hoursSinceEnd = (now.getTime() - end.getTime()) / (1000 * 60 * 60);
      return hoursSinceEnd >= 0 && hoursSinceEnd < 12;
    });
    return recent.length > 0 ? recent[recent.length - 1] : undefined;
  })();

  const liveRace = recentMeeting ? {
    name: recentMeeting.meeting_name,
    round: openF1Meetings ? Math.max(1, openF1Meetings.indexOf(recentMeeting) + 1) : 1,
    circuitId: recentMeeting.circuit_short_name.toLowerCase().replace(/\s+/g, "_"),
    flag: getCountryFlag(recentMeeting.country_code),
    meetingKey: recentMeeting.meeting_key,
    circuitName: recentMeeting.circuit_short_name,
    location: recentMeeting.location,
    country: recentMeeting.country_name,
    isLive: getMeetingStatus(recentMeeting) === "live",
  } : undefined;

  const countdown = useCountdown(nextRace?.date || "2026-12-31");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const sortedDrivers = allDrivers.slice().sort((a, b) => a.position - b.position);
  const top5 = sortedDrivers.slice(0, 5);
  const heroDrivers = sortedDrivers.slice(0, 6);
  const favDrivers = allDrivers.filter((d) => isFavoriteDriver(d.id)).slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero Header */}
        <View style={[styles.headerWrap, { paddingTop: topPadding + 8 }]}>
          <View style={styles.headerLogoCenter}>
            <Image source={LOGO_FULL} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerSeason}>2026 · {completed > 0 ? `${completed} ${t("home.of")} ${total || 24} ${t("home.rounds")}` : `${total || 24} ${t("home.rounds")}`}</Text>
            <TouchableOpacity style={styles.searchBtn} onPress={() => router.push("/search")}>
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Banner */}
        {liveRace && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/(tabs)/live", params: { meetingKey: String(liveRace.meetingKey) } })}
              activeOpacity={0.9}
            >
              <LinearGradient colors={[Colors.red, "#900000"]} style={styles.liveBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.liveBannerLeft}>
                  <View style={styles.liveRow}>
                    <LivePulse />
                    <Text style={styles.liveLabel}>
                      {liveRace.isLive ? t("home.live_now") : t("home.recent")} · {t("home.round")} {liveRace.round}
                    </Text>
                  </View>
                  <Text style={styles.liveBannerRace}>{liveRace.name}</Text>
                  <Text style={styles.liveBannerCircuit}>{liveRace.circuitName}</Text>
                  <Text style={styles.liveBannerLocation}>{liveRace.location}, {liveRace.country}</Text>
                </View>
                <View style={styles.liveBannerRight}>
                  <Text style={styles.liveBannerFlag}>{liveRace.flag}</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Driver Championship Hero Row */}
        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionTitle}>{t("home.championship_battle")}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/standings")}>
              <Text style={styles.sectionMore}>{t("home.see_all")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {heroDrivers.map((d) => <DriverHeroCard key={d.id} driver={d} rank={d.position} />)}
          </ScrollView>
        </View>

        {/* Favorites */}
        {favDrivers.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 16 }]}>
            <View style={styles.sectionHdr}>
              <Text style={styles.sectionTitle}>{t("home.your_favourites")}</Text>
            </View>
            {favDrivers.map((driver) => {
              const team = getTeam(driver.teamId);
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.favRow}
                  onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.favRowLeft}>
                    {getDriverPhoto(driver.id) ? (
                      <Image source={getDriverPhoto(driver.id)!} style={styles.favPhoto} />
                    ) : (
                      <View style={[styles.favPhotoPlaceholder, { backgroundColor: team?.color + "33" }]}>
                        <Text style={[styles.favPhotoNum, { color: team?.color }]}>{driver.number}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.favName}>{driver.name}</Text>
                      <Text style={[styles.favTeam, { color: team?.color || Colors.textSecondary }]}>{team?.shortName}</Text>
                    </View>
                  </View>
                  <View style={styles.favRight}>
                    <Text style={styles.favPts}>{driver.points} <Text style={styles.favPtsLabel}>PTS</Text></Text>
                    <Text style={styles.favPos}>P{driver.position} WDC</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Standings Preview */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionTitle}>{t("home.drivers_standings")}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/standings")}>
              <Text style={styles.sectionMore}>{t("home.see_all")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.standingsCard}>
            {top5.map((driver, idx) => {
              const team = getTeam(driver.teamId);
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.standRow, idx < top5.length - 1 && styles.standRowBorder]}
                  onPress={() => router.push({ pathname: "/driver/[id]", params: { id: driver.id } })}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.standPos, driver.position === 1 && styles.standPosGold]}>
                    {driver.position}
                  </Text>
                  {getDriverPhoto(driver.id) ? (
                    <Image source={getDriverPhoto(driver.id)!} style={styles.standPhoto} />
                  ) : (
                    <View style={[styles.standPhotoPlaceholder, { backgroundColor: team?.color + "22" }]}>
                      <Text style={[styles.standPhotoNum, { color: team?.color }]}>{driver.number}</Text>
                    </View>
                  )}
                  <View style={[styles.standBar, { backgroundColor: team?.color || "#555" }]} />
                  <View style={styles.standInfo}>
                    <Text style={styles.standShort}>{driver.shortName}</Text>
                    <Text style={styles.standFull}>{driver.name}</Text>
                  </View>
                  <View style={styles.standRight}>
                    <Text style={styles.standPtsVal}>{driver.points}</Text>
                    <Text style={styles.standPtsLabel}>PTS</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Next Race */}
        {nextRace && (
          <View style={[styles.section, { paddingHorizontal: 16 }]}>
            <View style={styles.sectionHdr}>
              <Text style={styles.sectionTitle}>{t("home.next_race")}</Text>
              <Text style={styles.sectionBadge}>{t("home.round")} {nextRace.round}</Text>
            </View>
            <LinearGradient colors={["#1A1A1A", "#111"]} style={styles.countdownCard}>
              <View style={styles.countdownTop}>
                <Text style={styles.countdownFlag}>{nextRace.flag}</Text>
                <View>
                  <Text style={styles.countdownName}>{nextRace.name}</Text>
                  <Text style={styles.countdownDate}>
                    {new Date(nextRace.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </Text>
                </View>
              </View>
              <View style={styles.countdownRow}>
                {[
                  { v: countdown.days, l: t("home.days") },
                  { v: countdown.hours, l: t("home.hrs") },
                  { v: countdown.minutes, l: t("home.min") },
                  { v: countdown.seconds, l: t("home.sec") },
                ].map((unit, i) => (
                  <React.Fragment key={unit.l}>
                    {i > 0 && <Text style={styles.countdownColon}>:</Text>}
                    <View style={styles.countdownUnit}>
                      <Text style={styles.countdownValue}>{String(unit.v).padStart(2, "0")}</Text>
                      <Text style={styles.countdownLabel}>{unit.l}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const HERO_CARD_WIDTH = SCREEN_WIDTH * 0.40;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { paddingHorizontal: 16, marginBottom: 16 },
  headerLogoCenter: { alignItems: "center", marginBottom: 14 },
  headerLogo: { width: 340, height: 80, maxWidth: "90%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerSeason: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  liveBanner: { marginHorizontal: 16, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 28 },
  liveBannerLeft: { flex: 1 },
  liveBannerRight: { alignItems: "center", flexDirection: "row", gap: 4 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  liveLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: 2 },
  liveBannerRace: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, marginBottom: 3 },
  liveBannerCircuit: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.65)" },
  liveBannerLocation: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  liveBannerFlag: { fontSize: 28 },
  section: { marginBottom: 28 },
  sectionHdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary, letterSpacing: 2.5 },
  sectionMore: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.red, letterSpacing: 1 },
  sectionBadge: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.red, letterSpacing: 1 },
  heroCard: {
    width: HERO_CARD_WIDTH,
    height: HERO_CARD_WIDTH * 1.4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroDriverPhoto: {
    position: "absolute",
    bottom: 0,
    right: -6,
    width: "75%",
    height: "80%",
  },
  heroDriverBigNumber: {
    position: "absolute",
    top: -10,
    right: -8,
    fontFamily: "Inter_700Bold",
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -5,
  },
  heroCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  heroTeamStripe: { width: 28, height: 3, borderRadius: 2, marginBottom: 6 },
  heroDriverFirstName: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 1 },
  heroDriverLastName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white, letterSpacing: 0.5, marginBottom: 8 },
  heroCardStats: { flexDirection: "row", alignItems: "center" },
  heroCardStat: { flex: 1, alignItems: "center" },
  heroCardDivider: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  heroCardStatVal: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },
  heroCardStatLabel: { fontFamily: "Inter_500Medium", fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginTop: 1 },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  favRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  favPhoto: { width: 44, height: 44, borderRadius: 22 },
  favPhotoPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  favPhotoNum: { fontFamily: "Inter_700Bold", fontSize: 16 },
  favName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white, marginBottom: 2 },
  favTeam: { fontFamily: "Inter_500Medium", fontSize: 11 },
  favRight: { alignItems: "flex-end" },
  favPts: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  favPtsLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  favPos: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  standingsCard: { backgroundColor: Colors.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  standRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  standRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  standPos: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textSecondary, width: 22, textAlign: "center" },
  standPosGold: { color: "#FFD700" },
  standPhoto: { width: 38, height: 38, borderRadius: 19 },
  standPhotoPlaceholder: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  standPhotoNum: { fontFamily: "Inter_700Bold", fontSize: 13 },
  standBar: { width: 3, height: 30, borderRadius: 2 },
  standInfo: { flex: 1 },
  standShort: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white },
  standFull: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  standRight: { alignItems: "flex-end" },
  standPtsVal: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.white },
  standPtsLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textSecondary, letterSpacing: 1 },
  countdownCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border },
  countdownTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  countdownFlag: { fontSize: 36 },
  countdownName: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.white, marginBottom: 3 },
  countdownDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  countdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  countdownUnit: { alignItems: "center", minWidth: 56 },
  countdownValue: { fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.white, letterSpacing: -1 },
  countdownLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.textSecondary, letterSpacing: 2, marginTop: 4 },
  countdownColon: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.red, marginBottom: 8 },
});
