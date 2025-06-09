import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getPrayerTimes, LocationData } from '../utils/prayerTimes';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  adhanEnabled: boolean;
  vibrationEnabled: boolean;
  reminderMinutes: number;
  notificationsEnabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = {
    adhanEnabled: true,
    vibrationEnabled: true,
    reminderMinutes: 15,
    notificationsEnabled: true,
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Notification permissions not granted');
    }

    // Configure notification categories for actions
    await this.setupNotificationCategories();

    // Register background task for iOS
    if (Platform.OS === 'ios') {
      await this.registerBackgroundTask();
    }
  }

  private async setupNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('prayer-reminder', [
      {
        identifier: 'mark-prayed',
        buttonTitle: 'Mark as Prayed',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Remind in 5 min',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);
  }

  private async registerBackgroundTask() {
    if (Platform.OS === 'ios') {
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) {
          console.error('Background task error:', error);
          return;
        }
        // Schedule next day's prayers
        await this.scheduleNextDayPrayers();
      });
    }
  }

  async updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.settings.notificationsEnabled) {
      await this.scheduleAllPrayerNotifications();
    } else {
      await this.cancelAllNotifications();
    }
  }

  // Helper function to parse time string and create valid Date
  private parseTimeString(timeString: string): { hours: number; minutes: number } | null {
    try {
      // Handle "12:30 PM" format specifically
      const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
      const match = timeString.trim().match(timeRegex);
      
      if (!match) {
        console.error('Invalid time format:', timeString);
        return null;
      }

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      // Validate ranges
      if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59 || hours < 1 || hours > 12) {
        console.error('Invalid time values:', timeString, { hours, minutes });
        return null;
      }

      // Convert 12-hour to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      console.log(`Parsed time: ${timeString} -> ${hours}:${minutes.toString().padStart(2, '0')}`);
      return { hours, minutes };
    } catch (error) {
      console.error('Error parsing time string:', timeString, error);
      return null;
    }
  }

  async scheduleAllPrayerNotifications(location?: LocationData) {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!this.settings.notificationsEnabled) {
        return;
      }

      const prayers = await getPrayerTimes(location);
      const now = new Date();

      for (const prayer of prayers) {
        // Skip sunrise as it's not a prayer time
        if (prayer.name === 'Sunrise') continue;

        const timeData = this.parseTimeString(prayer.time);
        if (!timeData) {
          console.error('Could not parse prayer time:', prayer.time);
          continue;
        }

        const { hours, minutes } = timeData;
        const prayerTime = new Date();
        prayerTime.setHours(hours, minutes, 0, 0);

        // Validate the created date
        if (isNaN(prayerTime.getTime())) {
          console.error('Invalid prayer time created:', prayer.time, hours, minutes);
          continue;
        }

        // If prayer time has passed today, schedule for tomorrow
        if (prayerTime <= now) {
          prayerTime.setDate(prayerTime.getDate() + 1);
        }

        // Schedule reminder notification
        if (this.settings.reminderMinutes > 0) {
          const reminderTime = new Date(prayerTime.getTime() - this.settings.reminderMinutes * 60 * 1000);
          
          // Validate reminder time
          if (!isNaN(reminderTime.getTime()) && reminderTime > now) {
            await this.scheduleNotification({
              title: `${prayer.name} Prayer Reminder`,
              body: `${prayer.name} prayer is in ${this.settings.reminderMinutes} minutes at ${prayer.time}`,
              trigger: reminderTime,
              categoryIdentifier: 'prayer-reminder',
              data: { 
                prayerName: prayer.name, 
                type: 'reminder',
                prayerTime: prayer.time 
              },
            });
          }
        }

        // Schedule adhan notification at prayer time
        if (this.settings.adhanEnabled) {
          await this.scheduleNotification({
            title: `${prayer.name} Prayer Time`,
            body: `It's time for ${prayer.name} prayer`,
            trigger: prayerTime,
            categoryIdentifier: 'prayer-reminder',
            sound: 'default',
            data: { 
              prayerName: prayer.name, 
              type: 'adhan',
              shouldVibrate: this.settings.vibrationEnabled 
            },
          });
        }
      }

      console.log('All prayer notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling prayer notifications:', error);
    }
  }

  private async scheduleNotification(options: {
    title: string;
    body: string;
    trigger: Date;
    categoryIdentifier?: string;
    sound?: string;
    data?: any;
  }) {
    const { title, body, trigger, categoryIdentifier, sound, data } = options;

    // Validate trigger date
    if (!trigger || isNaN(trigger.getTime())) {
      console.error('Invalid trigger date for notification:', trigger);
      return null;
    }

    // Ensure trigger is in the future
    if (trigger <= new Date()) {
      console.warn('Trigger time is in the past, skipping notification:', trigger);
      return null;
    }

    try {
      console.log(`Scheduling notification: ${title} at ${trigger.toLocaleString()}`);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier,
          sound: sound || 'default',
          data,
          vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        },
        trigger: {
          date: trigger,
        },
      });

      console.log(`Notification scheduled with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async scheduleNextDayPrayers() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.scheduleAllPrayerNotifications();
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async cancelPrayerNotifications(prayerName: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.prayerName === prayerName) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  async testNotification() {
    // For testing purposes
    const testTime = new Date(Date.now() + 5000); // 5 seconds from now
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Prayer Notification',
        body: 'This is a test notification from Salati',
        sound: 'default',
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        date: testTime,
      },
    });
  }

  // Handle notification responses
  async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const { prayerName, type } = notification.request.content.data || {};

    switch (actionIdentifier) {
      case 'mark-prayed':
        // Mark prayer as completed
        console.log(`${prayerName} marked as prayed`);
        // You can save this to storage or sync with backend
        break;
      
      case 'snooze':
        // Schedule a snooze notification
        const snoozeTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await this.scheduleNotification({
          title: `${prayerName} Prayer Reminder`,
          body: `Don't forget ${prayerName} prayer`,
          trigger: snoozeTime,
          data: { prayerName, type: 'snooze' },
        });
        break;
      
      default:
        // Default tap - open app
        console.log('Notification tapped, opening app');
        break;
    }
  }
}

export default NotificationService;
