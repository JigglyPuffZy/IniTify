import { Linking, StyleSheet, Text, View } from 'react-native';
import type { PagasaUpdate } from '@/src/models/pagasa-update';
import { pagasaNewsService } from '@/src/services/pagasa-news/pagasa-news.service';
import { PrimaryButton } from '@/src/components/UiComponents';

interface PagasaUpdateCardProps {
  update: PagasaUpdate;
  /** When true, shows that this is not today's publication */
  isOlderAdvisory?: boolean;
}

export function PagasaUpdateCard({ update, isOlderAdvisory = false }: PagasaUpdateCardProps) {
  const emoji = pagasaNewsService.categoryEmoji(update.category);

  return (
    <View style={styles.card}>
      {isOlderAdvisory ? (
        <Text style={styles.olderNote}>
          Older official advisory — not published today
        </Text>
      ) : null}
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>
          {emoji} {update.category.toUpperCase()}
        </Text>
        {update.is_important ? <Text style={styles.importantBadge}>Important</Text> : null}
      </View>

      <Text style={styles.title}>{update.title}</Text>
      <Text style={styles.summary}>
        {update.ai_summary || update.original_content.slice(0, 280)}
      </Text>

      {update.affected_locations?.length ? (
        <Text style={styles.locations}>
          Areas mentioned: {update.affected_locations.join(' · ')}
        </Text>
      ) : null}

      <Text style={styles.meta}>
        Published: {pagasaNewsService.formatPublishedDate(update.published_at)}
      </Text>
      <Text style={styles.source}>Source: {update.source_name}</Text>

      <PrimaryButton
        label="View Official Update"
        variant="secondary"
        onPress={() => Linking.openURL(update.source_url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  olderNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  importantBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
  },
  summary: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  locations: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  source: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
});
