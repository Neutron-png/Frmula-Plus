import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useTranslation, setLanguage, getCurrentLanguage } from "@/i18n";
import { useNotifications } from "@/context/NotificationsContext";

const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
] as const;

const SESSION_LABELS: Record<string, string> = {
  practice: "Practice Sessions",
  qualifying: "Qualifying",
  sprint: "Sprint",
  race: "Race",
};

const SESSION_ICONS: Record<string, string> = {
  practice: "speedometer-outline",
  qualifying: "timer-outline",
  sprint: "flash-outline",
  race: "flag",
};

export default function SettingsTab() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 8;
  const currentLang = getCurrentLanguage();

  const {
    globalEnabled,
    sessionTypes,
    toggleGlobal,
    toggleSessionType,
  } = useNotifications();

  const handleLanguageChange = async (langCode: string) => {
    await setLanguage(langCode);
    const isArabic = langCode === "ar";
    if (I18nManager.isRTL !== isArabic) {
      I18nManager.allowRTL(isArabic);
      I18nManager.forceRTL(isArabic);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.headerTitle}>{t("settings.title").toUpperCase()}</Text>
        <Text style={styles.headerSub}>App Preferences</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="language" size={16} color={Colors.red} />
            </View>
            <Text style={styles.sectionTitle}>{t("settings.language").toUpperCase()}</Text>
          </View>
          <View style={styles.card}>
            {LANGUAGES.map((lang, idx) => {
              const isActive = currentLang === lang.code;
              const isLast = idx === LANGUAGES.length - 1;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langRow, !isLast && styles.langRowBorder]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={styles.langInfo}>
                    <Text style={[styles.langNative, isActive && styles.langActiveText]}>
                      {lang.nativeLabel}
                    </Text>
                    <Text style={styles.langEnglish}>{lang.label}</Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.red} />
                    </View>
                  )}
                  {!isActive && <View style={styles.activeCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="notifications" size={16} color={Colors.red} />
            </View>
            <Text style={styles.sectionTitle}>{t("settings.notifications").toUpperCase()}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons
                  name={globalEnabled ? "notifications" : "notifications-off"}
                  size={20}
                  color={globalEnabled ? Colors.white : Colors.textTertiary}
                />
                <View>
                  <Text style={[styles.toggleTitle, !globalEnabled && styles.dimText]}>
                    Race Notifications
                  </Text>
                  <Text style={styles.toggleSub}>Reminders before sessions start</Text>
                </View>
              </View>
              <Switch
                value={globalEnabled}
                onValueChange={toggleGlobal}
                trackColor={{ false: Colors.border, true: Colors.red + "88" }}
                thumbColor={globalEnabled ? Colors.red : Colors.textTertiary}
              />
            </View>
          </View>

          {globalEnabled && (
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.subSectionTitle}>NOTIFY ME FOR</Text>
              {(Object.keys(SESSION_LABELS) as Array<keyof typeof sessionTypes>).map((type, idx) => {
                const isLast = idx === Object.keys(SESSION_LABELS).length - 1;
                const enabled = sessionTypes[type];
                return (
                  <View key={type} style={[styles.toggleRow, !isLast && styles.rowBorder]}>
                    <View style={styles.toggleLeft}>
                      <Ionicons
                        name={SESSION_ICONS[type] as any}
                        size={18}
                        color={enabled ? Colors.white : Colors.textTertiary}
                      />
                      <Text style={[styles.toggleTitle, !enabled && styles.dimText]}>
                        {SESSION_LABELS[type]}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleSessionType(type)}
                      trackColor={{ false: Colors.border, true: Colors.red + "88" }}
                      thumbColor={enabled ? Colors.red : Colors.textTertiary}
                    />
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/notifications-settings")}
            activeOpacity={0.7}
          >
            <Ionicons name="alarm-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.linkRowText}>Manage Scheduled Reminders</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="information-circle" size={16} color={Colors.red} />
            </View>
            <Text style={styles.sectionTitle}>ABOUT</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.infoRow, styles.rowBorder]}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={[styles.infoRow, styles.rowBorder]}>
              <Text style={styles.infoLabel}>Season</Text>
              <Text style={styles.infoValue}>2026</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data Source</Text>
              <Text style={styles.infoValue}>Trust Me Bro</Text>
            </View>
          </View>
        </View>

        <View style={styles.brandWrap}>
          <Text style={styles.brandText}>FRMULA+</Text>
          <Text style={styles.brandSub}>The premium F1 companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === "web" ? 34 : 120,
    gap: 24,
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.red + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  subSectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  langRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  langFlag: { fontSize: 26 },
  langInfo: { flex: 1 },
  langNative: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
    marginBottom: 2,
  },
  langActiveText: { color: Colors.red },
  langEnglish: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  activeCheck: { width: 24, alignItems: "center" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  toggleSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dimText: { color: Colors.textTertiary },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkRowText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
  brandWrap: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  brandText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textTertiary,
    letterSpacing: 4,
  },
  brandSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
});
