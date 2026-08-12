/** Philippine date helpers — "Today" is always Asia/Manila, never hardcoded. */
export const PH_TIMEZONE = 'Asia/Manila';

/** YYYY-MM-DD in Philippine time */
export function getPhDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getPhPublishedDateKey(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getPhDateKey(parsed);
}

export function isPublishedOnPhDate(iso: string | null, dateKey: string): boolean {
  const pubKey = getPhPublishedDateKey(iso);
  return pubKey !== null && pubKey === dateKey;
}

export function formatPhDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function daysBetweenPhDateKeys(olderKey: string, newerKey: string): number {
  const [oy, om, od] = olderKey.split('-').map(Number);
  const [ny, nm, nd] = newerKey.split('-').map(Number);
  const older = Date.UTC(oy, om - 1, od);
  const newer = Date.UTC(ny, nm - 1, nd);
  return Math.round((newer - older) / (24 * 60 * 60 * 1000));
}

export function partitionUpdatesByPhDate<
  T extends { published_at: string | null },
>(items: T[], now: Date = new Date()) {
  const todayKey = getPhDateKey(now);
  const today: T[] = [];
  const previous: T[] = [];
  const archive: T[] = [];

  for (const item of items) {
    const pubKey = getPhPublishedDateKey(item.published_at);
    if (!pubKey) {
      previous.push(item);
      continue;
    }
    if (pubKey === todayKey) {
      today.push(item);
    } else {
      const ageDays = daysBetweenPhDateKeys(pubKey, todayKey);
      if (ageDays <= 14) {
        previous.push(item);
      } else {
        archive.push(item);
      }
    }
  }

  return {
    todayKey,
    todayLabel: formatPhDateLabel(now),
    today,
    previous,
    archive,
    hasTodayUpdates: today.length > 0,
    latestOlder: previous[0] ?? archive[0] ?? null,
  };
}
