import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ReminderTime,
  SessionInfo,
  scheduleRaceReminder,
  cancelReminder,
  cancelAllReminders,
  requestNotificationPermission,
} from "@/services/notifications";

const PREFS_KEY = "@frmula_notification_prefs";

interface SessionTypes {
  practice: boolean;
  qualifying: boolean;
  sprint: boolean;
  race: boolean;
}

interface ScheduledReminder {
  notificationId: string;
  sessionKey: number;
  sessionName: string;
  sessionType: string;
  dateStart: string;
  reminderTime: ReminderTime;
}

interface NotificationPrefs {
  globalEnabled: boolean;
  defaultReminderTime: ReminderTime;
  sessionTypes: SessionTypes;
  scheduledReminders: Record<string, ScheduledReminder>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  globalEnabled: false,
  defaultReminderTime: "30min",
  sessionTypes: {
    practice: false,
    qualifying: true,
    sprint: true,
    race: true,
  },
  scheduledReminders: {},
};

interface NotificationsContextValue {
  globalEnabled: boolean;
  defaultReminderTime: ReminderTime;
  sessionTypes: SessionTypes;
  scheduledReminders: Record<string, ScheduledReminder>;
  toggleGlobal: () => void;
  setDefaultReminder: (time: ReminderTime) => void;
  toggleSessionType: (type: keyof SessionTypes) => void;
  setReminderForSession: (session: SessionInfo, reminderTime?: ReminderTime) => Promise<boolean>;
  removeReminderForSession: (sessionKey: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const json = await AsyncStorage.getItem(PREFS_KEY);
        if (json) {
          const parsed = JSON.parse(json);
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  const persist = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggleGlobal = useCallback(async () => {
    setPrefs((prev) => {
      const newEnabled = !prev.globalEnabled;
      const next = { ...prev, globalEnabled: newEnabled };

      if (newEnabled) {
        requestNotificationPermission();
      } else {
        cancelAllReminders();
        next.scheduledReminders = {};
      }

      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setDefaultReminder = useCallback(
    (time: ReminderTime) => {
      const next = { ...prefs, defaultReminderTime: time };
      persist(next);
    },
    [prefs, persist]
  );

  const toggleSessionType = useCallback(
    (type: keyof SessionTypes) => {
      const next = {
        ...prefs,
        sessionTypes: { ...prefs.sessionTypes, [type]: !prefs.sessionTypes[type] },
      };
      persist(next);
    },
    [prefs, persist]
  );

  const setReminderForSession = useCallback(
    async (session: SessionInfo, reminderTime?: ReminderTime): Promise<boolean> => {
      const time = reminderTime || prefs.defaultReminderTime;
      const key = String(session.session_key);

      const existing = prefs.scheduledReminders[key];
      if (existing) {
        await cancelReminder(existing.notificationId);
      }

      const notificationId = await scheduleRaceReminder(session, time);
      if (!notificationId) return false;

      const reminder: ScheduledReminder = {
        notificationId,
        sessionKey: session.session_key,
        sessionName: session.session_name,
        sessionType: session.session_type,
        dateStart: session.date_start,
        reminderTime: time,
      };

      const next = {
        ...prefs,
        scheduledReminders: { ...prefs.scheduledReminders, [key]: reminder },
      };
      persist(next);
      return true;
    },
    [prefs, persist]
  );

  const removeReminderForSession = useCallback(
    async (sessionKey: number) => {
      const key = String(sessionKey);
      const existing = prefs.scheduledReminders[key];
      if (existing) {
        await cancelReminder(existing.notificationId);
      }
      const { [key]: _, ...rest } = prefs.scheduledReminders;
      const next = { ...prefs, scheduledReminders: rest };
      persist(next);
    },
    [prefs, persist]
  );

  const value = useMemo(
    () => ({
      globalEnabled: prefs.globalEnabled,
      defaultReminderTime: prefs.defaultReminderTime,
      sessionTypes: prefs.sessionTypes,
      scheduledReminders: prefs.scheduledReminders,
      toggleGlobal,
      setDefaultReminder,
      toggleSessionType,
      setReminderForSession,
      removeReminderForSession,
    }),
    [prefs, toggleGlobal, setDefaultReminder, toggleSessionType, setReminderForSession, removeReminderForSession]
  );

  if (!loaded) return null;

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
