import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { PageMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import { WeatherRefreshCountdown } from '@/src/components/WeatherRefreshCountdown';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { useResponsive, useResponsiveTabBar, type ResponsiveMetrics } from '@/src/utils/responsive';

function weatherIcon(
  condition: string,
  isDay: boolean,
): React.ComponentProps<typeof Ionicons>['name'] {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'thunderstorm';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy';
  if (c.includes('snow')) return 'snow';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'cloud';
  if (c.includes('clear') || c.includes('sunny')) return isDay ? 'sunny' : 'moon';
  if (c.includes('cloud') || c.includes('overcast')) return isDay ? 'partly-sunny' : 'cloudy-night';
  return isDay ? 'partly-sunny' : 'moon';
}

interface WeatherTabContentProps {
  weather: CurrentWeatherSnapshot | null;
  loading: boolean;
  configured: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  horizontalPadding?: number;
  weatherRefreshSecondsLeft?: number;
}

export function WeatherTabContent({
  weather,
  loading,
  configured,
  refreshing,
  onRefresh,
  horizontalPadding = layout.pagePadding,
  weatherRefreshSecondsLeft = 0,
}: WeatherTabContentProps) {
  const insets = useSafeAreaInsets();
  const tab = useResponsiveTabBar();
  const responsive = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, isDark, responsive),
    [palette, isDark, responsive],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + tab.totalHeight },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
      >
        <ScreenTopAccent />

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: horizontalPadding }}>
          <PageMasthead
            overline={TUGUEGARAO_STUDY_AREA.label}
            title="Weather"
            subtitle={weather ? weather.lastUpdated : configured ? 'Loading…' : 'Unavailable'}
            live={Boolean(weather)}
          />

          <View style={styles.countdownBlock}>
            <WeatherRefreshCountdown
              secondsLeft={weatherRefreshSecondsLeft}
              refreshing={refreshing || loading}
            />
          </View>

          {!configured ? (
            <EmptyPanel
              icon="cloud-offline-outline"
              title="Unavailable"
              body="Pull down to retry."
              styles={styles}
              palette={palette}
            />
          ) : !weather ? (
            <EmptyPanel
              icon="cloud-outline"
              title={loading ? 'Loading' : 'No data'}
              body="Pull down to refresh."
              actionLabel="Refresh"
              onAction={onRefresh}
              loading={loading}
              styles={styles}
              palette={palette}
            />
          ) : (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.tempBlock}>
                    <Text style={styles.tempValue}>{Math.round(weather.tempC)}</Text>
                    <Text style={styles.tempUnit}>°C</Text>
                  </View>
                  <View style={styles.iconOrb}>
                    <Ionicons
                      name={weatherIcon(weather.conditionText, weather.isDay)}
                      size={36}
                      color={palette.primary}
                    />
                  </View>
                </View>

                <Text style={styles.condition}>{weather.conditionText}</Text>
                <Text style={styles.location}>{weather.locationName}</Text>

                <View style={styles.heatFeatured}>
                  <View style={styles.heatFeaturedLeft}>
                    <Ionicons name="flame" size={20} color={palette.primary} />
                    <Text style={styles.heatFeaturedLabel}>Heat index</Text>
                  </View>
                  <Text style={styles.heatFeaturedValue}>{weather.heatIndexC}°</Text>
                </View>

                <View style={styles.quickStats}>
                  <QuickStat
                    icon="thermometer-outline"
                    label="Feels like"
                    value={`${Math.round(weather.feelsLikeC)}°`}
                    styles={styles}
                    palette={palette}
                  />
                  <View style={styles.quickDivider} />
                  <QuickStat
                    icon="water-outline"
                    label="Humidity"
                    value={`${weather.humidity}%`}
                    styles={styles}
                    palette={palette}
                    highlight={weather.humidity >= 70}
                  />
                  <View style={styles.quickDivider} />
                  <QuickStat
                    icon="navigate-outline"
                    label="Wind"
                    value={`${Math.round(weather.windKph)}`}
                    styles={styles}
                    palette={palette}
                  />
                </View>
              </View>

              <SectionRule label="Details" styles={styles} />

              <View style={styles.metricsCard}>
                <MetricRow
                  icon="flame-outline"
                  label="Heat index"
                  value={`${weather.heatIndexC}°C`}
                  styles={styles}
                  palette={palette}
                  featured
                />
                <MetricRow
                  icon="body-outline"
                  label="Feels like"
                  value={`${weather.feelsLikeC}°C`}
                  styles={styles}
                  palette={palette}
                />
                <MetricRow
                  icon="water-outline"
                  label="Humidity"
                  value={`${weather.humidity}%`}
                  styles={styles}
                  palette={palette}
                />
                <MetricRow
                  icon="navigate-outline"
                  label="Wind"
                  value={`${weather.windKph} km/h ${weather.windDir}`}
                  styles={styles}
                  palette={palette}
                />
                <MetricRow
                  icon={weather.isDay ? 'sunny-outline' : 'moon-outline'}
                  label="Period"
                  value={weather.isDay ? 'Day' : 'Night'}
                  styles={styles}
                  palette={palette}
                  last
                />
              </View>

              <Pressable
                onPress={onRefresh}
                disabled={refreshing}
                style={({ pressed }) => [styles.footer, pressed && styles.pressed]}
              >
                <View style={styles.footerText}>
                  <Text style={styles.footerTitle}>{weather.locationName}</Text>
                  <Text style={styles.footerBody}>{weather.lastUpdated}</Text>
                </View>
                {refreshing ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Ionicons name="refresh" size={18} color={palette.primary} />
                )}
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function SectionRule({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionRule}>
      <Text style={styles.sectionRuleLabel}>{label}</Text>
      <View style={styles.sectionRuleLine} />
    </View>
  );
}

function QuickStat({
  icon,
  label,
  value,
  styles,
  palette,
  highlight,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  highlight?: boolean;
}) {
  return (
    <View style={styles.quickStat}>
      <Ionicons
        name={icon}
        size={14}
        color={highlight ? palette.primary : palette.textMuted}
      />
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({
  icon,
  label,
  value,
  styles,
  palette,
  featured,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  featured?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.metricRow, !last && styles.metricRowBorder]}>
      <View style={[styles.metricIcon, featured && styles.metricIconFeatured]}>
        <Ionicons name={icon} size={17} color={palette.primary} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, featured && styles.metricValueFeatured]}>{value}</Text>
    </View>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  loading,
  styles,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={loading}
          style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={palette.primary} />
              <Text style={styles.emptyBtnText}>{actionLabel}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, r: ResponsiveMetrics) {
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },
    countdownBlock: {
      marginBottom: spacing.lg,
    },

    heroCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xxl,
      padding: r.isCompact ? spacing.lg : layout.cardPaddingLg,
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    tempBlock: { flexDirection: 'row', alignItems: 'flex-start', flexShrink: 1 },
    tempValue: {
      fontFamily: fonts.header,
      fontSize: r.displayTempSize + 4,
      letterSpacing: -4,
      lineHeight: r.displayTempLineHeight + 4,
      color: p.text,
    },
    tempUnit: {
      fontFamily: fonts.headerSemi,
      fontSize: r.tempUnitSize + 2,
      color: p.textMuted,
      marginTop: r.isCompact ? 8 : 12,
      marginLeft: 2,
    },
    iconOrb: {
      width: r.isCompact ? 60 : 72,
      height: r.isCompact ? 60 : 72,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    condition: {
      fontFamily: fonts.headerSemi,
      fontSize: r.isCompact ? 17 : 20,
      letterSpacing: -0.3,
      color: p.text,
      lineHeight: r.isCompact ? 22 : 26,
      flexShrink: 1,
    },
    location: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: -4,
    },
    heatFeatured: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: r.isCompact ? spacing.md : spacing.lg,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
    },
    heatFeaturedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    heatFeaturedLabel: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
    },
    heatFeaturedHint: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 1,
    },
    heatFeaturedValue: {
      fontFamily: fonts.header,
      fontSize: 32,
      letterSpacing: -1,
      color: p.primary,
    },
    quickStats: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginTop: spacing.xs,
    },
    quickStat: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
    },
    quickStatValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
    },
    quickStatLabel: {
      ...typography.overline,
      fontSize: 9,
      color: p.textMuted,
    },
    quickDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
      marginVertical: spacing.xs,
    },

    sectionRule: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionRuleLabel: {
      ...typography.overline,
      color: p.textMuted,
      flexShrink: 0,
    },
    sectionRuleLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
    },

    metricsCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadow,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 56,
    },
    metricRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: p.surfaceInset,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    metricIconFeatured: {
      backgroundColor: p.primarySoft,
    },
    metricLabel: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
      flex: 1,
    },
    metricValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
      flexShrink: 0,
    },
    metricValueFeatured: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.primary,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    footerIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    footerText: { flex: 1, minWidth: 0 },
    footerTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
    },
    footerBody: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },
    refreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      flexShrink: 0,
    },
    refreshLabel: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
    },

    emptyCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPaddingLg,
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: p.text,
      textAlign: 'center',
    },
    emptyBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 280,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.15)',
      minWidth: 140,
      justifyContent: 'center',
    },
    emptyBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
    },

    pressed: { opacity: 0.88 },
  });
}
