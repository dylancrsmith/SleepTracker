import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { UserSettings } from "./storage";

const REMINDER_ID_KEY = "dreamstreak_sleep_aid_notification_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function clearExistingReminder(): Promise<void> {
  const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (!existingId) return;

  await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {
    // Safe no-op if the previous reminder is no longer scheduled.
  });
  await AsyncStorage.removeItem(REMINDER_ID_KEY);
}

export async function scheduleSleepAidReminder(
  settings: UserSettings,
): Promise<void> {
  if (Platform.OS === "web") return;

  const permissions = await Notifications.getPermissionsAsync();
  let granted = permissions.granted;

  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    granted = request.granted;
  }

  if (!granted) {
    throw new Error("Notification permission was not granted.");
  }

  await clearExistingReminder();

  const bedtimeMinutes = settings.bedtimeHour * 60 + settings.bedtimeMinute;
  const reminderMinutes =
    (bedtimeMinutes - settings.reminderMinutes + 24 * 60) % (24 * 60);
  const hour = Math.floor(reminderMinutes / 60);
  const minute = reminderMinutes % 60;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sleep Aid",
      body: "You usually sleep soon. Start winding down now?",
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });

  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
}

export async function cancelSleepAidReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  await clearExistingReminder();
}
