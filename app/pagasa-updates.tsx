import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  LoadingState,
  EmptyState,
} from '@/src/components/ScreenContainer';
import { PagasaUpdateCard } from '@/src/components/PagasaUpdateCard';
import { pagasaNewsService } from '@/src/services/pagasa-news/pagasa-news.service';
import type { PagasaUpdatesFeed } from '@/src/models/pagasa-update';

export default function PagasaUpdatesScreen() {
  const { profile } = useIniTify();
  const [feed, setFeed] = useState<PagasaUpdatesFeed | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    const result = await pagasaNewsService.getFeed(new Date());
    setMessage(result.message);
    setFeed(result.data);
  }, []);

  useEffect(() => {
    loadFeed().finally(() => setLoading(false));
    const interval = setInterval(() => {
      void loadFeed();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  async function onRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  if (!profile) return <Redirect href="/" />;
  if (loading) return <LoadingState message="Loading DOST-PAGASA updates..." />;

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenContainer title="DOST-PAGASA Updates">
        <InfoBanner
          message={`Philippine date (Asia/Manila): ${feed?.todayLabel ?? '—'}. Today's section uses each item's official publication date — not when it was collected.`}
          variant="info"
        />

        {!pagasaNewsService.isConfigured() ? (
          <InfoBanner
            message="Configure Supabase in .env and run initify_supabase_pagasa_news.sql."
            variant="warning"
          />
        ) : null}

        <Text style={styles.sectionTitle}>
          Today&apos;s DOST-PAGASA Updates — {feed?.todayLabel}
        </Text>

        {feed?.hasTodayUpdates ? (
          feed.today.map((item) => <PagasaUpdateCard key={item.id} update={item} />)
        ) : (
          <>
            <EmptyState message="No new DOST-PAGASA updates have been published today." />
            {feed?.latestOlder ? (
              <>
                <Text style={styles.sectionTitle}>Latest Previous Official Advisory</Text>
                <PagasaUpdateCard update={feed.latestOlder} isOlderAdvisory />
              </>
            ) : null}
          </>
        )}

        {feed?.previous?.length ? (
          <>
            <Text style={styles.sectionTitle}>Previous Updates</Text>
            {(feed.hasTodayUpdates
              ? feed.previous
              : feed.previous.filter((item) => item.id !== feed.latestOlder?.id)
            ).map((item) => (
              <PagasaUpdateCard key={item.id} update={item} isOlderAdvisory />
            ))}
          </>
        ) : null}

        {feed?.archive?.length ? (
          <>
            <Text style={styles.sectionTitle}>Archive</Text>
            {feed.archive.map((item) => (
              <PagasaUpdateCard key={item.id} update={item} isOlderAdvisory />
            ))}
          </>
        ) : null}

        {message ? <Text style={styles.footer}>{message}</Text> : null}
      </ScreenContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  footer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
});
