import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InAppNotification, InAppNotificationType } from '@/src/models/in-app-notification';

const STORAGE_PREFIX = '@initify/in-app-notifications';
const MAX_ITEMS = 50;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

async function readAll(userId: string): Promise<InAppNotification[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as InAppNotification[];
  } catch {
    return [];
  }
}

async function writeAll(userId: string, items: InAppNotification[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export const inAppNotificationService = {
  async list(userId: string): Promise<InAppNotification[]> {
    const items = await readAll(userId);
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async unreadCount(userId: string): Promise<number> {
    const items = await readAll(userId);
    return items.filter((n) => !n.read).length;
  },

  async add(
    userId: string,
    input: {
      type: InAppNotificationType;
      title: string;
      body: string;
      href?: string;
      /** Skip if same type was added within this many minutes */
      dedupeMinutes?: number;
    },
  ): Promise<InAppNotification | null> {
    const items = await readAll(userId);
    const dedupeMs = (input.dedupeMinutes ?? 60) * 60 * 1000;
    const now = Date.now();
    const recent = items.find(
      (n) =>
        n.type === input.type &&
        now - new Date(n.createdAt).getTime() < dedupeMs,
    );
    if (recent) return null;

    const notification: InAppNotification = {
      id: `${Date.now()}-${input.type}`,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await writeAll(userId, [notification, ...items]);
    return notification;
  },

  async markRead(userId: string, id: string): Promise<InAppNotification[]> {
    const items = await readAll(userId);
    const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    await writeAll(userId, next);
    return next.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async markAllRead(userId: string): Promise<InAppNotification[]> {
    const items = await readAll(userId);
    const next = items.map((n) => ({ ...n, read: true }));
    await writeAll(userId, next);
    return next;
  },

  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId));
  },
};
