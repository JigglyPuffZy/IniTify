import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import type { HeatRiskLevel } from '@/src/models/risk';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { Button } from '@/src/components/UiComponents';
import { HomeMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import { WeatherRefreshCountdown } from '@/src/components/WeatherRefreshCountdown';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const levelIcons: Record<HeatRiskLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  LOW: 'shield-checkmark',
  MODERATE: 'alert-circle',
  HIGH: 'warning',
  EXTREME: 'flame',
};

interface HomeOverviewProps {
  firstName: string;
  greeting: string;
  weather: CurrentWeatherSnapshot | null;
  liveWeatherEnabled: boolean;
  isLive: boolean;
  assessmentLevel: HeatRiskLevel | null;
  assessmentMessage?: string;
  onCheckRisk: () => void;
  horizontalPadding?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  weatherRefreshSecondsLeft?: number;
  emergencyActive?: boolean;
  extraContent?: React.ReactNode;
}

export function HomeOverview({
  firstName,
  greeting,
  weather,
  liveWeatherEnabled,
  isLive,
  assessmentLevel,
  assessmentMessage,
  onCheckRisk,
  horizontalPadding = layout.pagePadding,
  refreshing = false,
  onRefresh,
  weatherRefreshSecondsLeft = 0,
  emergencyActive = false,
  extraContent,
}: HomeOverviewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  const riskColor = assessmentLevel ? RISK_LEVEL_COLORS[assessmentLevel] : palette.primary;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + 72 },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          ) : undefined
        }
      >
        {/* Subtle top accent */}
        <ScreenTopAccent />

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: horizontalPadding }}>
          <HomeMasthead
            greeting={greeting}
            name={firstName}
            location={TUGUEGARAO_STUDY_AREA.city}
            isLive={isLive}
            avatarLetter={firstName.charAt(0).toUpperCase()}
            onProfilePress={() => router.push('/profile')}
          />

          {emergencyActive ? (
            <Pressable
              onPress={() => router.push('/emergency')}
              style={({ pressed }) => [styles.alertStrip, pressed && styles.pressed]}
            >
              <Ionicons name="alert-circle" size={18} color={palette.primary} />
              <Text style={styles.alertStripText}>Emergency active — tap for hotlines</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.primary} />
            </Pressable>
          ) : null}

          {/* Weather */}
          <View style={styles.weatherSectionHead}>
            <View style={styles.weatherSectionRule}>
              <SectionRule label="Weather" styles={styles} />
            </View>
            <WeatherRefreshCountdown
              secondsLeft={weatherRefreshSecondsLeft}
              refreshing={refreshing}
            />
            {onRefresh ? (
              <Pressable
                onPress={onRefresh}
                disabled={refreshing}
                style={({ pressed }) => [styles.weatherRefreshBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Refresh weather"
              >
                <Ionicons name="refresh" size={16} color={palette.primary} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.weatherCard}>
            {weather ? (
              <>
                <View style={styles.weatherTop}>
                  <View style={styles.tempBlock}>
                    <Text style={styles.tempValue}>
                      {Number(weather.tempC.toFixed(1))}
                    </Text>
                    <Text style={styles.tempUnit}>°C</Text>
                  </View>
                  <View style={styles.weatherMeta}>
                    {weather.conditionIconUrl ? (
                      <Image
                        source={{ uri: weather.conditionIconUrl }}
                        style={styles.weatherIcon}
                      />
                    ) : (
                      <Ionicons
                        name={weather.isDay ? 'partly-sunny' : 'moon'}
                        size={40}
                        color={palette.primary}
                      />
                    )}
                    <Text style={styles.condition} numberOfLines={2}>
                      {weather.conditionText}
                    </Text>
                  </View>
                </View>

                <View style={styles.heatStrip}>
                  <Ionicons name="flame" size={16} color={palette.primary} />
                  <Text style={styles.heatStripLabel}>Heat index</Text>
                  <Text style={styles.heatStripValue}>
                    {Number(weather.heatIndexC.toFixed(1))}°C
                  </Text>
                  <Text style={styles.heatStripSep}>·</Text>
                  <Text style={styles.heatStripFeels}>
                    Feels {Math.round(weather.feelsLikeC)}°
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <StatCell
                    icon="water-outline"
                    label="Humidity"
                    value={`${weather.humidity}%`}
                    styles={styles}
                    palette={palette}
                    highlight={weather.humidity >= 70}
                  />
                  <View style={styles.statDivider} />
                  <StatCell
                    icon="navigate-outline"
                    label="Wind"
                    value={`${Math.round(weather.windKph)} km/h`}
                    styles={styles}
                    palette={palette}
                  />
                  <View style={styles.statDivider} />
                  <StatCell
                    icon="compass-outline"
                    label="Direction"
                    value={weather.windDir}
                    styles={styles}
                    palette={palette}
                  />
                </View>

                <Text style={styles.weatherUpdated}>
                  {TUGUEGARAO_STUDY_AREA.city}
                  {isLive ? ' · Live' : ''}
                </Text>
              </>
            ) : (
              <View style={styles.weatherEmpty}>
                <Ionicons name="cloud-outline" size={28} color={palette.textMuted} />
                <Text style={styles.weatherEmptyText}>
                  {liveWeatherEnabled ? 'Loading…' : 'Unavailable'}
                </Text>
              </View>
            )}
          </View>

          <SectionRule label="Assessment" styles={styles} />

          {assessmentLevel ? (
            <View style={[styles.riskCard, { borderLeftColor: riskColor }]}>
              <View style={styles.riskCardHead}>
                <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
                  <Ionicons name={levelIcons[assessmentLevel]} size={20} color={riskColor} />
                </View>
                <View style={styles.riskCardTitles}>
                  <Text style={styles.riskEyebrow}>Heat risk</Text>
                  <Text style={[styles.riskLevel, { color: riskColor }]}>
                    {RISK_LEVEL_LABELS[assessmentLevel]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/assessment')}
                  hitSlop={8}
                  style={({ pressed }) => [styles.riskDetailsBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.riskDetailsText}>Details</Text>
                </Pressable>
              </View>

              {assessmentMessage ? (
                <Text style={styles.riskMessage}>{assessmentMessage}</Text>
              ) : null}

              <View style={styles.riskActions}>
                <Pressable
                  onPress={() => router.push('/safety-tips')}
                  style={({ pressed }) => [styles.riskActionGhost, pressed && styles.pressed]}
                >
                  <Ionicons name="bulb-outline" size={16} color={palette.text} />
                  <Text style={styles.riskActionGhostText}>Safety tips</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.riskEmpty}>
              <Text style={styles.riskEmptyHeadline}>Check your heat risk</Text>
              <Text style={styles.riskEmptyBody}>
                {assessmentMessage ?? 'Based on weather and your health profile.'}
              </Text>
              <Button label="Run check" icon="arrow-forward" onPress={onCheckRisk} />
            </View>
          )}

          <SectionRule label="Explore" styles={styles} />

          <View style={styles.bentoGrid}>
            <BentoTile
              title="Check-in"
              subtitle="Chat with Tify"
              icon="pulse-outline"
              href="/(tabs)/check-in"
              styles={styles}
              palette={palette}
              large
            />
            <BentoTile
              title="Safety tips"
              subtitle="Risk & health guidance"
              icon="shield-outline"
              href="/safety-tips"
              styles={styles}
              palette={palette}
            />
            <BentoTile
              title="Emergency"
              subtitle="Hotlines & first aid"
              icon="call-outline"
              href="/emergency"
              styles={styles}
              palette={palette}
            />
            <BentoTile
              title="Hospitals"
              subtitle="Nearest care centers"
              icon="medkit-outline"
              href="/hospital"
              styles={styles}
              palette={palette}
            />
            <BentoTile
              title="Reminders"
              subtitle="Check-in schedule"
              icon="alarm-outline"
              href="/reminder-settings"
              styles={styles}
              palette={palette}
            />
          </View>

          {extraContent ? <View style={styles.extra}>{extraContent}</View> : null}
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

function StatCell({
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
    <View style={styles.statCell}>
      <Ionicons
        name={icon}
        size={14}
        color={highlight ? palette.primary : palette.textMuted}
      />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: palette.primary }]}>{value}</Text>
    </View>
  );
}

function BentoTile({
  title,
  subtitle,
  icon,
  href,
  styles,
  palette,
  large,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  large?: boolean;
}) {
  const router = useRouter();

  if (large) {
    return (
      <Pressable
        onPress={() => router.push(href as never)}
        style={({ pressed }) => [styles.bentoTile, styles.bentoTileLarge, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={[styles.bentoIconWrap, styles.bentoIconWrapInline]}>
          <Ionicons name={icon} size={22} color={palette.primary} />
        </View>
        <View style={styles.bentoLargeText}>
          <Text style={styles.bentoTitle}>{title}</Text>
          <Text style={styles.bentoSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={palette.textLight} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [styles.bentoTile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.bentoIconWrap}>
        <Ionicons name={icon} size={22} color={palette.primary} />
      </View>
      <Text style={styles.bentoTitle}>{title}</Text>
      <Text style={styles.bentoSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={14}
        color={palette.textLight}
        style={styles.bentoArrow}
      />
    </Pressable>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    /* Alert strip */
    alertStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.18)',
    },
    alertStripText: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.primary,
      flex: 1,
    },

    /* Weather card */
    weatherSectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    weatherSectionRule: {
      flex: 1,
      minWidth: 0,
    },
    weatherRefreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.lg,
    },
    weatherRefreshText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.primary,
    },
    weatherCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xxl,
      padding: layout.cardPaddingLg,
      gap: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    weatherTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    tempBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tempValue: {
      fontFamily: fonts.header,
      fontSize: 72,
      letterSpacing: -4,
      lineHeight: 76,
      color: p.text,
    },
    tempUnit: {
      fontFamily: fonts.headerSemi,
      fontSize: 22,
      color: p.textMuted,
      marginTop: 10,
      marginLeft: 2,
    },
    weatherMeta: {
      alignItems: 'flex-end',
      gap: spacing.xs,
      maxWidth: '42%',
    },
    weatherIcon: { width: 52, height: 52 },
    condition: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
      textAlign: 'right',
      lineHeight: 19,
    },
    heatStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: p.primarySoft,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    heatStripLabel: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
      flex: 1,
    },
    heatStripValue: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.primary,
    },
    heatStripSep: { color: p.textLight, fontSize: 12 },
    heatStripFeels: {
      ...typography.caption,
      color: p.textMuted,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
    },
    statLabel: {
      ...typography.overline,
      fontSize: 9,
      color: p.textMuted,
    },
    statValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.text,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
      marginVertical: spacing.xs,
    },
    weatherUpdated: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    weatherEmpty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    weatherEmptyText: {
      ...typography.bodySm,
      color: p.textMuted,
    },

    /* Section rules */
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

    /* Risk card */
    riskCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPaddingLg,
      gap: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      borderLeftWidth: 4,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    riskCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    riskBadge: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    riskCardTitles: { flex: 1, minWidth: 0 },
    riskEyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: p.textMuted,
      marginBottom: 2,
    },
    riskLevel: {
      fontFamily: fonts.header,
      fontSize: 26,
      letterSpacing: -0.5,
      lineHeight: 30,
    },
    riskDetailsBtn: { paddingVertical: 4, paddingLeft: spacing.sm },
    riskDetailsText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
    },
    riskMessage: {
      ...typography.body,
      color: p.textSecondary,
      lineHeight: 23,
    },
    riskActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    riskActionGhost: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: p.surfaceMuted,
      borderWidth: 1,
      borderColor: p.border,
    },
    riskActionGhostText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
    },
    riskActionPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      borderRadius: radius.md,
    },
    riskActionPrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: '#FFF',
    },
    disabled: { opacity: 0.65 },

    /* Risk empty */
    riskEmpty: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPaddingLg,
      gap: spacing.md,
      marginBottom: spacing.xxl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    riskEmptyHeadline: {
      fontFamily: fonts.header,
      fontSize: 24,
      letterSpacing: -0.5,
      lineHeight: 30,
      color: p.text,
    },
    riskEmptyBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 21,
      marginBottom: spacing.xs,
    },

    /* Bento grid */
    bentoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    bentoTile: {
      width: '48%',
      flexGrow: 1,
      minWidth: 140,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      minHeight: 128,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    bentoTileLarge: {
      width: '100%',
      minHeight: 80,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    bentoIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    bentoIconWrapInline: {
      marginBottom: 0,
      flexShrink: 0,
    },
    bentoLargeText: {
      flex: 1,
      minWidth: 0,
    },
    bentoTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
      letterSpacing: -0.2,
    },
    bentoSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 3,
      lineHeight: 16,
      paddingRight: spacing.lg,
    },
    bentoArrow: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
    },

    extra: { marginTop: spacing.md },
    pressed: { opacity: 0.88 },
  });
}
