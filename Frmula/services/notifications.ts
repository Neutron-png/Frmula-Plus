import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type ReminderTime = "at_time" | "15min" | "30min" | "1hour" | "1day";

export interface SessionInfo {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  meeting_name?: string;
}

const REMINDER_OFFSETS: Record<ReminderTime, number> = {
  at_time: 0,
  "15min": 15 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

const REMINDER_LABELS: Record<ReminderTime, string> = {
  at_time: "now",
  "15min": "15 minutes",
  "30min": "30 minutes",
  "1hour": "1 hour",
  "1day": "1 day",
};

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleRaceReminder(
  session: SessionInfo,
  reminderTime: ReminderTime
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const sessionDate = new Date(session.date_start);
    const offset = REMINDER_OFFSETS[reminderTime];
    const triggerDate = new Date(sessionDate.getTime() - offset);

    if (triggerDate.getTime() <= Date.now()) return null;

    const label = REMINDER_LABELS[reminderTime];
    const body =
      reminderTime === "at_time"
        ? `${session.session_name} starts now!`
        : `${session.session_name} starts in ${label}`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "FRMULA+ Race Reminder",
        body,
        data: {
          sessionKey: session.session_key,
          sessionType: session.session_type,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch {
    return null;
  }
}

export async function cancelReminder(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export function formatSessionTimeLocal(dateStart: string): string {
  try {
    const date = new Date(dateStart);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return new Date(dateStart).toLocaleString();
  }
}

export function getReminderTimeLabel(reminderTime: ReminderTime): string {
  switch (reminderTime) {
    case "at_time":
      return "At event time";
    case "15min":
      return "15 min before";
    case "30min":
      return "30 min before";
    case "1hour":
      return "1 hour before";
    case "1day":
      return "1 day before";
  }
}
