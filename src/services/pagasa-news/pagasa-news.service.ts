import { getSupabaseClient } from '@/src/config/supabase.client';
import { appConfig } from '@/src/config/app.config';
import type { PagasaUpdate, PagasaUpdatesFeed } from '@/src/models/pagasa-update';
import type { ServiceResult } from '@/src/models/service-result';
import {
  PH_TIMEZONE,
  formatPhDateLabel,
  getPhDateKey,
  getPhPublishedDateKey,
  partitionUpdatesByPhDate,
} from '@/src/utils/ph-date';

function mapRow(row: Record<string, unknown>): PagasaUpdate {
  return row as unknown as PagasaUpdate;
}

async function fetchApprovedUpdates(limit = 100): Promise<ServiceResult<PagasaUpdate[]>> {
  const supabase = getSupabaseClient();
  if (!supabase && !appConfig.newsApiUrl) {
    return {
      status: 'requires_configuration',
      data: null,
      message: 'Supabase or news API not configured.',
    };
  }

  if (appConfig.newsApiUrl) {
    try {
      const base = appConfig.newsApiUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/feed?limit=${limit}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { status: 'error', data: null, message: json.error || 'News API error' };
      }
      if (json.feed) {
        return {
          status: 'success',
          data: [
            ...(json.feed.today || []),
            ...(json.feed.previous || []),
            ...(json.feed.archive || []),
          ] as PagasaUpdate[],
          message: json.message || 'Loaded DOST-PAGASA updates.',
          feed: json.feed as PagasaUpdatesFeed,
        };
      }
      return {
        status: 'success',
        data: (json.updates as PagasaUpdate[]) || [],
        message: 'Loaded DOST-PAGASA updates.',
      };
    } catch {
      return { status: 'unavailable', data: null, message: 'News API unreachable.' };
    }
  }

  const { data, error } = await supabase!
    .from('pagasa_updates')
    .select('*')
    .eq('status', 'approved')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return {
      status: 'error',
      data: null,
      message: `${error.message} Run initify_supabase_pagasa_news.sql in Supabase.`,
    };
  }

  return {
    status: 'success',
    data: (data || []).map(mapRow),
    message: 'Loaded DOST-PAGASA updates.',
  };
}

type FetchResult = ServiceResult<PagasaUpdate[]> & { feed?: PagasaUpdatesFeed };

export const pagasaNewsService = {
  isConfigured(): boolean {
    return (
      (appConfig.supabaseUrl !== null && appConfig.supabaseAnonKey !== null) ||
      appConfig.newsApiUrl !== null
    );
  },

  async getFeed(now: Date = new Date()): Promise<ServiceResult<PagasaUpdatesFeed>> {
    const result = (await fetchApprovedUpdates(100)) as FetchResult;
    if (result.status !== 'success' || !result.data) {
      return {
        status: result.status,
        data: null,
        message: result.message,
      };
    }

    if (result.feed) {
      return {
        status: 'success',
        data: result.feed,
        message: result.feed.hasTodayUpdates
          ? `${result.feed.today.length} update(s) published on ${result.feed.todayLabel}.`
          : 'No new DOST-PAGASA updates have been published today.',
      };
    }

    const partitioned = partitionUpdatesByPhDate(result.data, now);
    const feed: PagasaUpdatesFeed = {
      todayKey: partitioned.todayKey,
      todayLabel: partitioned.todayLabel,
      timezone: PH_TIMEZONE,
      today: partitioned.today,
      previous: partitioned.previous,
      archive: partitioned.archive,
      hasTodayUpdates: partitioned.hasTodayUpdates,
      latestOlder: partitioned.latestOlder,
    };

    return {
      status: 'success',
      data: feed,
      message: feed.hasTodayUpdates
        ? `${feed.today.length} update(s) published on ${feed.todayLabel}.`
        : 'No new DOST-PAGASA updates have been published today.',
    };
  },

  formatPublishedDate(iso: string | null): string {
    if (!iso) return 'Publication date not specified';
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: PH_TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  },

  formatPublishedDateShort(iso: string | null): string {
    if (!iso) return 'Date not specified';
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: PH_TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  },

  isOlderThanToday(iso: string | null, now: Date = new Date()): boolean {
    const pubKey = getPhPublishedDateKey(iso);
    if (!pubKey) return true;
    const todayKey = getPhDateKey(now);
    return pubKey !== todayKey;
  },

  categoryEmoji(category: string): string {
    switch (category) {
      case 'Rainfall Warning':
      case 'Flood Advisory':
        return '🌧️';
      case 'Tropical Cyclone':
      case 'Severe Weather':
        return '🌀';
      case 'Thunderstorm Advisory':
        return '⛈️';
      case 'Earthquake':
        return '🌍';
      case 'Climate':
        return '🌡️';
      case 'Weather Advisory':
        return '🌤️';
      default:
        return '📢';
    }
  },
};
