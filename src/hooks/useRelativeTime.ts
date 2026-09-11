import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/src/utils/relative-time';

/** Re-computes a relative time label on an interval (for live “Updated … ago”). */
export function useRelativeTime(iso: string | null | undefined, tickMs = 15_000): string {
  const [label, setLabel] = useState(() => formatRelativeTime(iso));

  useEffect(() => {
    if (!iso) {
      setLabel('—');
      return;
    }
    const tick = () => setLabel(formatRelativeTime(iso));
    tick();
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [iso, tickMs]);

  return label;
}
