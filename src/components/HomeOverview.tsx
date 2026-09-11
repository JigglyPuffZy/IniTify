import { useMemo, useState } from 'react';
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
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, riskLevelLabelFontSize, formatHeatIndexAssessmentLine } from '@/src/constants/risk-levels';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { useRelativeTime } from '@/src/hooks/useRelativeTime';
import { assessEnvironmentalRisk } from '@/src/services/decision-tree/heat-risk-classifier';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/src/components/UiComponents';
import { HomeMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import { ProfileAvatarPicker } from '@/src/components/ProfileAvatarPicker';
import { WeatherRefreshCountdown } from '@/src/components/WeatherRefreshCountdown';
import {
  formatWeatherLocationSource,
  formatWeatherObservationTime,
  weatherObservationIso,
} from '@/src/utils/weather-display';
import { resolveProfileAvatarId, type ProfileAvatarId } from '@/src/constants/profile-avatars';
import { liveIndicatorColors } from '@/src/constants/live-indicator';
import { layout, radius, spacing, typography, fonts } from '@/src/theme';
import { cardShadow } from '@/src/theme/shadows';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { useResponsive, useResponsiveTabBar, type ResponsiveMetrics } from '@/src/utils/responsive';

const levelIcons: Record<HeatRiskLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  LOW: 'shield-checkmark',
  MODERATE: 'alert-circle',
  HIGH: 'warning',
  EXTREME: 'flame',
  CRITICAL: 'skull',
};

const EXPLORE_LINKS: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
  tone?: 'default' | 'emergency';
}[] = [
  {
    title: 'Safety tips',
    subtitle: 'Guidance for your heat risk level',
    icon: 'shield-checkmark-outline',
    href: '/safety-tips',
  },
  {
    title: 'Emergency',
    subtitle: 'Hotlines, first aid & SOS',
    icon: 'warning-outline',
    href: '/emergency',
    tone: 'emergency',
  },
  {
    title: 'Hospitals',
    subtitle: 'Nearest care in Tuguegarao',
    icon: 'medkit-outline',
    href: '/hospital',
  },
  {
    title: 'Reminders',
    subtitle: 'Check-in schedule & alerts',
    icon: 'alarm-outline',
    href: '/reminder-settings',
  },
];

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

function ExploreMenuRow({
  item,
  isLast,
  styles,
  palette,
  isDark,
  onPress,
}: {
  item: (typeof EXPLORE_LINKS)[number];
  isLast: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  isDark: boolean;
  onPress: () => void;
}) {
  const isEmergency = item.tone === 'emergency';
  const iconBg = isEmergency
    ? isDark
      ? 'rgba(239,68,68,0.2)'
      : '#FEF2F2'
    : palette.primarySoft;
  const iconColor = isEmergency ? '#DC2626' : palette.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.exploreRow,
        !isLast && styles.exploreRowBorder,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.exploreRowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={item.icon} size={20} color={iconColor} />
      </View>
      <View style={styles.exploreRowCopy}>
        <Text style={styles.exploreRowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.exploreRowSubtitle} numberOfLines={2}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
    </Pressable>
  );
}

interface HomeOverviewProps {
  firstName: string;
  fullName: string;
  greeting: string;
  avatarId?: ProfileAvatarId | null;
  onAvatarChange?: (avatarId: ProfileAvatarId) => void;
  weather: CurrentWeatherSnapshot | null;
  liveWeatherEnabled: boolean;
  isLive: boolean;
  assessmentLevel: HeatRiskLevel | null;
  environmentalLevel?: HeatRiskLevel | null;
  assessmentReason?: string | null;
  assessedAt?: string | null;
  onCheckRisk: () => void;
  horizontalPadding?: number;
  refreshing?: boolean;
  isWeatherRefreshing?: boolean;
  onRefresh?: () => void;
  weatherRefreshSecondsLeft?: number;
  emergencyActive?: boolean;
  extraContent?: React.ReactNode;
}

export function HomeOverview({
  firstName,
  fullName,
  greeting,
  avatarId,
  onAvatarChange,
  weather,
  liveWeatherEnabled,
  isLive,
  assessmentLevel,
  environmentalLevel = null,
  assessmentReason = null,
  assessedAt,
  onCheckRisk,
  horizontalPadding = layout.pagePadding,
  refreshing = false,
  isWeatherRefreshing = false,
  onRefresh,
  weatherRefreshSecondsLeft = 0,
  emergencyActive = false,
  extraContent,
}: HomeOverviewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tab = useResponsiveTabBar();
  const responsive = useResponsive();
  const { palette, isDark } = useAppTheme();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const selectedAvatarId = resolveProfileAvatarId({ avatarId });
  const styles = useMemo(
    () => createStyles(palette, isDark, responsive),
    [palette, isDark, responsive],
  );

  const assessedLabel = useRelativeTime(assessedAt);
  const heatBand = weather ? assessEnvironmentalRisk(weather.heatIndexC) : null;
  const personalLevel = assessmentLevel;
  const outdoorLevel = environmentalLevel ?? null;
  const pagasaLevel = outdoorLevel ?? heatBand?.level ?? personalLevel;
  const heatBandColor = heatBand ? RISK_LEVEL_COLORS[heatBand.level] : palette.primary;
  const riskColor = personalLevel ? RISK_LEVEL_COLORS[personalLevel] : palette.primary;
  const riskLabel = personalLevel ? RISK_LEVEL_LABELS[personalLevel] : '';
  const pagasaLabel = pagasaLevel ? RISK_LEVEL_LABELS[pagasaLevel] : '';
  const riskLabelSize = personalLevel
    ? riskLevelLabelFontSize(riskLabel, responsive.isCompact ? 20 : 24)
    : 24;
  const weatherSyncing = refreshing || isWeatherRefreshing;
  const showPagasaNote =
    pagasaLevel != null && personalLevel != null && pagasaLevel !== personalLevel;
  const assessmentFact =
    assessmentReason ??
    formatHeatIndexAssessmentLine(weather?.heatIndexC ?? null, personalLevel);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + tab.totalHeight },
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
            avatarId={avatarId}
            onProfilePress={() => router.push('/profile')}
            onAvatarPress={() => setAvatarPickerOpen(true)}
          />

          <ProfileAvatarPicker
            visible={avatarPickerOpen}
            name={fullName}
            selectedId={selectedAvatarId}
            onSelect={(id) => onAvatarChange?.(id)}
            onClose={() => setAvatarPickerOpen(false)}
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

          {/* Weather — live Open-Meteo */}
          <View style={styles.weatherSection}>
            <View style={styles.weatherSectionHead}>
              <View style={styles.weatherSectionTitles}>
                <Text style={styles.weatherSectionTitle}>Weather</Text>
                <Text style={styles.weatherSectionSubtitle}>{TUGUEGARAO_STUDY_AREA.city}</Text>
              </View>
              {isLive ? (
                <View style={styles.livePill}>
                  <View style={styles.livePillDot} />
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
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
                          size={44}
                          color={palette.primary}
                        />
                      )}
                      <Text style={styles.condition} numberOfLines={2}>
                        {weather.conditionText}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.heatIndexHero, { borderColor: `${heatBandColor}55` }]}>
                    <View style={[styles.heatIndexSwatch, { backgroundColor: heatBandColor }]} />
                    <View style={styles.heatIndexCopy}>
                      <Text style={styles.heatIndexLabel}>Heat index</Text>
                      <Text style={[styles.heatIndexValue, { color: heatBandColor }]}>
                        {Number(weather.heatIndexC.toFixed(1))}°C
                      </Text>
                      {heatBand ? (
                        <Text style={styles.heatIndexBand} numberOfLines={1}>
                          {heatBand.label}
                        </Text>
                      ) : null}
                      <Text style={styles.heatIndexMeta} numberOfLines={2}>
                        {formatWeatherObservationTime(weatherObservationIso(weather))}
                        {' · '}
                        {formatWeatherLocationSource(weather.coordSource)}
                      </Text>
                    </View>
                    <Ionicons name="flame" size={22} color={heatBandColor} />
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

                  <WeatherRefreshCountdown
                    secondsLeft={weatherRefreshSecondsLeft}
                    refreshing={weatherSyncing}
                    lastUpdatedAt={weatherObservationIso(weather)}
                    onRefresh={onRefresh}
                  />
                </>
              ) : (
                <View style={styles.weatherEmpty}>
                  <Ionicons name="cloud-outline" size={28} color={palette.textMuted} />
                  <Text style={styles.weatherEmptyText}>
                    {liveWeatherEnabled ? 'Fetching live weather…' : 'Unavailable'}
                  </Text>
                  {onRefresh ? (
                    <Pressable
                      onPress={onRefresh}
                      style={({ pressed }) => [styles.weatherRetryBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.weatherRetryText}>Tap to refresh</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Assessment — syncs with live heat index */}
          <View style={styles.assessmentSection}>
            <View style={styles.assessmentSectionHead}>
              <Text style={styles.assessmentSectionTitle}>Assessment</Text>
              <Text style={styles.assessmentSectionSubtitle}>
                {assessmentLevel
                  ? 'Based on live weather and your health profile'
                  : 'Updates when live weather refreshes'}
              </Text>
            </View>

          {personalLevel ? (
            <View style={[styles.riskCard, { borderColor: `${riskColor}44` }]}>
              <LinearGradient
                colors={isDark ? [`${riskColor}22`, 'transparent'] : [`${riskColor}14`, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.riskCardGradient}
              >
                <Pressable
                  onPress={() => router.push('/assessment')}
                  style={({ pressed }) => [styles.riskCardHead, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="View heat risk details"
                >
                  <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                    <Ionicons name={levelIcons[personalLevel]} size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.riskCardTitles}>
                    <Text style={styles.riskEyebrow}>Your health risk</Text>
                    <Text
                      style={[styles.riskLevel, { color: riskColor, fontSize: riskLabelSize }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {riskLabel}
                    </Text>
                    {showPagasaNote && pagasaLabel ? (
                      <Text style={styles.riskPagasaNote} numberOfLines={1}>
                        Outdoor level: {pagasaLabel}
                      </Text>
                    ) : null}
                    {assessedLabel ? (
                      <Text style={styles.riskUpdated} numberOfLines={1}>
                        Updated {assessedLabel}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textLight} style={styles.riskChevron} />
                </Pressable>

                <View style={styles.riskActions}>
                  <Pressable
                    onPress={() => router.push('/assessment')}
                    style={({ pressed }) => [styles.riskActionPrimary, { backgroundColor: riskColor }, pressed && styles.pressed]}
                  >
                    <Text style={styles.riskActionPrimaryText}>View details</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/safety-tips')}
                    style={({ pressed }) => [styles.riskActionGhost, pressed && styles.pressed]}
                  >
                    <Ionicons name="bulb-outline" size={16} color={palette.text} />
                    <Text style={styles.riskActionGhostText}>Safety tips</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.riskEmpty}>
              <View style={styles.riskEmptyIcon}>
                <Ionicons name="speedometer-outline" size={28} color={palette.primary} />
              </View>
              <Text style={styles.riskEmptyHeadline}>Heat risk assessment</Text>
              <Text style={styles.riskEmptyBody}>
                {weather
                  ? assessmentFact
                  : 'Waiting for live weather data…'}
              </Text>
              <Button
                label={weatherSyncing ? 'Syncing…' : 'Refresh'}
                icon="refresh"
                onPress={onCheckRisk}
                disabled={weatherSyncing}
              />
            </View>
          )}
          </View>

          <View style={styles.exploreSection}>
            <View style={styles.exploreHeader}>
              <Text style={styles.exploreTitle}>Explore</Text>
              <Text style={styles.exploreSubtitle}>Everything you need in one place</Text>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/check-in')}
              style={({ pressed }) => [styles.exploreHero, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Check-in with Tify"
            >
              <LinearGradient
                colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.exploreHeroGradient}
              >
                <View style={styles.exploreHeroIcon}>
                  <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
                </View>
                <View style={styles.exploreHeroCopy}>
                  <Text style={styles.exploreHeroEyebrow}>Recommended</Text>
                  <Text style={styles.exploreHeroTitle}>Check-in with Tify</Text>
                  <Text style={styles.exploreHeroBody} numberOfLines={2}>
                    Chat about how you feel in the heat — get instant safety tips
                  </Text>
                </View>
                <View style={styles.exploreHeroAction}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </Pressable>

            <View style={styles.exploreMenu}>
              {EXPLORE_LINKS.map((item, index) => (
                <ExploreMenuRow
                  key={item.href}
                  item={item}
                  isLast={index === EXPLORE_LINKS.length - 1}
                  styles={styles}
                  palette={palette}
                  isDark={isDark}
                  onPress={() => router.push(item.href as never)}
                />
              ))}
            </View>
          </View>

          {extraContent ? <View style={styles.extra}>{extraContent}</View> : null}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, r: ResponsiveMetrics) {
  const shadow = cardShadow();
  const live = liveIndicatorColors(isDark);

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

    /* Weather */
    weatherSection: {
      marginBottom: spacing.xxl,
      gap: spacing.md,
    },
    weatherSectionHead: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    weatherSectionTitles: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    weatherSectionTitle: {
      fontFamily: fonts.header,
      fontSize: 22,
      letterSpacing: -0.4,
      color: p.text,
    },
    weatherSectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: live.pillBg,
      borderWidth: 1.5,
      borderColor: live.pillBorder,
      flexShrink: 0,
    },
    livePillDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: live.dot,
      borderWidth: 2,
      borderColor: live.dotRing,
    },
    livePillText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: live.text,
    },
    weatherCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xxl,
      padding: r.isCompact ? spacing.lg : layout.cardPaddingLg,
      gap: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
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
      fontSize: r.displayTempSize,
      letterSpacing: -4,
      lineHeight: r.displayTempLineHeight,
      color: p.text,
    },
    tempUnit: {
      fontFamily: fonts.headerSemi,
      fontSize: r.tempUnitSize,
      color: p.textMuted,
      marginTop: r.isCompact ? 6 : 10,
      marginLeft: 2,
    },
    weatherMeta: {
      alignItems: 'flex-end',
      gap: spacing.xs,
      maxWidth: r.isCompact ? '38%' : '42%',
      flexShrink: 1,
      minWidth: 0,
    },
    weatherIcon: { width: 52, height: 52 },
    condition: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
      textAlign: 'right',
      lineHeight: 19,
    },
    heatIndexHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: p.surfaceMuted,
      borderWidth: 1,
    },
    heatIndexSwatch: {
      width: 6,
      alignSelf: 'stretch',
      borderRadius: radius.sm,
      flexShrink: 0,
    },
    heatIndexCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    heatIndexLabel: {
      ...typography.overline,
      fontSize: 10,
      color: p.textMuted,
    },
    heatIndexValue: {
      fontFamily: fonts.headerSemi,
      fontSize: 22,
      letterSpacing: -0.3,
    },
    heatIndexBand: {
      ...typography.caption,
      color: p.textSecondary,
    },
    heatIndexMeta: {
      ...typography.caption,
      fontSize: 11,
      color: p.textMuted,
      marginTop: 2,
      lineHeight: 15,
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
      fontSize: r.isNarrow ? 8 : 9,
      color: p.textMuted,
      textAlign: 'center',
    },
    statValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: r.isCompact ? 12 : 13,
      color: p.text,
      textAlign: 'center',
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
      marginVertical: spacing.xs,
    },
    weatherEmpty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    weatherEmptyText: {
      ...typography.bodySm,
      color: p.textMuted,
      textAlign: 'center',
    },
    weatherRetryBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
    },
    weatherRetryText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
    },

    /* Assessment */
    assessmentSection: {
      marginBottom: spacing.xxl,
      gap: spacing.md,
    },
    assessmentSectionHead: {
      gap: 4,
    },
    assessmentSectionTitle: {
      fontFamily: fonts.header,
      fontSize: 22,
      letterSpacing: -0.4,
      color: p.text,
    },
    assessmentSectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 18,
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
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      ...shadow,
    },
    riskCardGradient: {
      padding: layout.cardPaddingLg,
      gap: spacing.lg,
    },
    riskCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    riskBadge: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    riskCardTitles: { flex: 1, minWidth: 0, paddingRight: spacing.xs },
    riskEyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: p.textMuted,
      marginBottom: 2,
    },
    riskPagasaNote: {
      ...typography.caption,
      fontSize: 11,
      color: p.textMuted,
      marginTop: 2,
    },
    riskUpdated: {
      ...typography.caption,
      fontSize: 11,
      color: p.textLight,
      marginTop: 2,
    },
    riskLevel: {
      fontFamily: fonts.header,
      letterSpacing: -0.5,
      lineHeight: 26,
      flexShrink: 1,
    },
    riskChevron: { flexShrink: 0 },
    riskActions: {
      flexDirection: r.stackRiskActions ? 'column' : 'row',
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
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: radius.md,
    },
    riskActionPrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: '#FFFFFF',
    },
    disabled: { opacity: 0.65 },

    /* Risk empty */
    riskEmpty: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPaddingLg,
      gap: spacing.md,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    riskEmptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    riskEmptyHeadline: {
      fontFamily: fonts.header,
      fontSize: 20,
      letterSpacing: -0.4,
      lineHeight: 26,
      color: p.text,
      textAlign: 'center',
    },
    riskEmptyBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },

    /* Explore */
    exploreSection: {
      marginBottom: spacing.xxl,
      gap: spacing.lg,
    },
    exploreHeader: {
      gap: 4,
      marginBottom: spacing.xs,
    },
    exploreTitle: {
      fontFamily: fonts.header,
      fontSize: 22,
      letterSpacing: -0.4,
      color: p.text,
    },
    exploreSubtitle: {
      ...typography.bodySm,
      color: p.textMuted,
      lineHeight: 20,
    },
    exploreHero: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...shadow,
    },
    exploreHeroGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 96,
    },
    exploreHeroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    exploreHeroCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    exploreHeroEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.75)',
    },
    exploreHeroTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    exploreHeroBody: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.88)',
      lineHeight: 17,
      marginTop: 2,
    },
    exploreHeroAction: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    exploreMenu: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      ...shadow,
    },
    exploreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 72,
    },
    exploreRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    exploreRowIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    exploreRowCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
      paddingRight: spacing.xs,
    },
    exploreRowTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
      letterSpacing: -0.1,
    },
    exploreRowSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 17,
    },

    extra: { marginTop: spacing.md },
    pressed: { opacity: 0.88 },
  });
}
