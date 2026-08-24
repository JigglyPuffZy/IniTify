import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

/** Compact weather card for dashboards and secondary screens */
export function CurrentWeatherCard({
  weather,
  compact = false,
}: {
  weather: CurrentWeatherSnapshot;
  compact?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardIconFallback}>
          <Ionicons
            name={weather.isDay ? 'partly-sunny' : 'moon'}
            size={26}
            color={palette.primary}
          />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardCondition} numberOfLines={1}>
            {weather.conditionText}
          </Text>
          <Text style={styles.cardLocation} numberOfLines={1}>
            {weather.locationName || TUGUEGARAO_STUDY_AREA.city}
          </Text>
        </View>
        <Text style={styles.cardTemp}>{Math.round(weather.tempC)}°</Text>
      </View>

      <View style={styles.cardStats}>
        <CardStat label="Feels like" value={`${Math.round(weather.feelsLikeC)}°C`} styles={styles} />
        <View style={styles.cardDivider} />
        <CardStat label="Humidity" value={`${weather.humidity}%`} styles={styles} />
        <View style={styles.cardDivider} />
        <CardStat label="Wind" value={`${Math.round(weather.windKph)} km/h`} styles={styles} />
      </View>

      {!compact ? <Text style={styles.updated}>Updated {weather.lastUpdated}</Text> : null}
    </View>
  );
}

function CardStat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.cardStat}>
      <Text style={styles.cardStatValue}>{value}</Text>
      <Text style={styles.cardStatLabel}>{label}</Text>
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: layout.cardPadding,
      gap: spacing.lg,
      ...cardShadow(),
    },
    cardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardIconFallback: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, minWidth: 0 },
    cardCondition: { ...typography.h3, color: p.text },
    cardLocation: { ...typography.caption, color: p.textSecondary, marginTop: 2 },
    cardTemp: {
      fontFamily: fonts.header,
      fontSize: 36,
      letterSpacing: -1.5,
      color: p.text,
    },
    cardStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.surfaceInset,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    cardStat: { flex: 1, alignItems: 'center' },
    cardStatValue: { ...typography.label, color: p.text, fontSize: 14 },
    cardStatLabel: { ...typography.caption, color: p.textSecondary, marginTop: 2 },
    cardDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: p.border,
    },
    updated: { ...typography.caption, color: p.textMuted },
  });
}
