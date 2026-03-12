import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useNotifications } from "@/context/NotificationsContext";
import { ReminderTime, getReminderTimeLabel, formatSessionTimeLocal } from "@/services/notifications";

const REMINDER_OPTIONS: ReminderTime[] = ["at_time", "15min", "30min", "1hour", "1day"];

const SESSION_TYPE_LABELS: Record<string, string> = {
  practice: "Practice",
  qualifying: "Qualifying",
  sprint: "Sprint",
  race: "Race",
};

const SESSION_TYPE_ICONS: Record<string, string> = {
  practice: "speedometer-outline",
  qualifying: "timer-outline",
  sprint: "flash-outline",
  race: "flag",
};

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const {
    globalEnabled,
    defaultReminderTime,
    sessionTypes,
    scheduledReminders,
    toggleGlobal,
    setDefaultReminder,
    toggleSessionType,
    removeReminderForSession,
  } = useNotifications();

  const upcomingReminders = Object.values(scheduledReminders)
    .filter((r) => new Date(r.dateStart).getTime() > Date.now())
    .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : 100, gap: 16 }}
      >
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Ionicons name="notifications" size={20} color={globalEnabled ? Colors.red : Colors.textTertiary} />
              <View>
                <Text style={styles.cardRowTitle}>Race Notifications</Text>
                <Text style={styles.cardRowSub}>Get reminded before sessions start</Text>
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
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>DEFAULT REMINDER TIME</Text>
              {REMINDER_OPTIONS.map((option) => {
                const selected = defaultReminderTime === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => setDefaultReminder(option)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={selected ? Colors.red : Colors.textTertiary}
                    />
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {getReminderTimeLabel(option)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>SESSION TYPES</Text>
              <Text style={styles.sectionSub}>Choose which session types trigger notifications</Text>
              {(Object.keys(SESSION_TYPE_LABELS) as Array<keyof typeof SESSION_TYPE_LABELS>).map((type) => (
                <View key={type} style={styles.cardRow}>
                  <View style={styles.cardRowLeft}>
                    <Ionicons
                      name={SESSION_TYPE_ICONS[type] as any}
                      size={18}
                      color={sessionTypes[type as keyof typeof sessionTypes] ? Colors.white : Colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.cardRowTitle,
                        !sessionTypes[type as keyof typeof sessionTypes] && { color: Colors.textTertiary },
                      ]}
                    >
                      {SESSION_TYPE_LABELS[type]}
                    </Text>
                  </View>
                  <Switch
                    value={sessionTypes[type as keyof typeof sessionTypes]}
                    onValueChange={() => toggleSessionType(type as keyof typeof sessionTypes)}
                    trackColor={{ false: Colors.border, true: Colors.red + "88" }}
                    thumbColor={sessionTypes[type as keyof typeof sessionTypes] ? Colors.red : Colors.textTertiary}
                  />
                </View>
              ))}
            </View>

            {upcomingReminders.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>UPCOMING REMINDERS</Text>
                {upcomingReminders.map((reminder) => (
                  <View key={reminder.sessionKey} style={styles.reminderRow}>
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderName}>{reminder.sessionName}</Text>
                      <Text style={styles.reminderTime}>
                        {formatSessionTimeLocal(reminder.dateStart)}
                      </Text>
                      <Text style={styles.reminderLabel}>
                        {getReminderTimeLabel(reminder.reminderTime)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeReminderForSession(reminder.sessionKey)}
                      style={styles.reminderRemoveBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {upcomingReminders.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No upcoming reminders</Text>
                <Text style={styles.emptySubText}>
                  Reminders will appear here when you set them from the calendar
                </Text>
              </View>
            )}
          </>
        )}

        {!globalEnabled && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Notifications are disabled</Text>
            <Text style={styles.emptySubText}>
              Enable notifications to get reminded before race sessions
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardRowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  cardRowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  optionRowSelected: {
    backgroundColor: Colors.red + "11",
  },
  optionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.white,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "44",
  },
  reminderInfo: { flex: 1 },
  reminderName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.white,
    marginBottom: 2,
  },
  reminderTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  reminderLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.red,
  },
  reminderRemoveBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptySubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
    maxWidth: 260,
  },
});
