const PH_TIMEZONE = 'Asia/Manila';

function getPhDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getPhPublishedDateKey(iso) {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getPhDateKey(parsed);
}

function formatPhDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function daysBetweenPhDateKeys(olderKey, newerKey) {
  const [oy, om, od] = olderKey.split('-').map(Number);
  const [ny, nm, nd] = newerKey.split('-').map(Number);
  const older = Date.UTC(oy, om - 1, od);
  const newer = Date.UTC(ny, nm - 1, nd);
  return Math.round((newer - older) / (24 * 60 * 60 * 1000));
}

function partitionUpdatesByPhDate(items, now = new Date()) {
  const todayKey = getPhDateKey(now);
  const today = [];
  const previous = [];
  const archive = [];

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

module.exports = {
  PH_TIMEZONE,
  getPhDateKey,
  getPhPublishedDateKey,
  formatPhDateLabel,
  partitionUpdatesByPhDate,
};
