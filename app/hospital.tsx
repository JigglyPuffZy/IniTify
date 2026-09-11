import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  StyleSheet,
  View,
  Pressable,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { HeaderIconButton } from '@/src/components/layout/PageMasthead';
import { EmptyState } from '@/src/components/ScreenContainer';
import { hospitalService, type HospitalInfo } from '@/src/services/hospital/hospital.service';
import { locationService } from '@/src/services/location/location.service';
import { databaseService } from '@/src/services/database/database.service';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { resolveHospitalSearchLocation } from '@/src/utils/hospital-location';
import { useResponsive } from '@/src/utils/responsive';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import type { UserLocation } from '@/src/models/location';

const CITY_CENTER = resolveHospitalSearchLocation(null).location;

export default function HospitalScreen() {
  const { profile, location, locationStatus, refreshLocation } = useIniTify();
  const { horizontalPadding, isCompact } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark, isCompact), [palette, isDark, isCompact]);

  const [message, setMessage] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const [searchLocation, setSearchLocation] = useState<UserLocation | null>(location);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const nearest = hospitals[0] ?? null;
  const others = hospitals.slice(1);

  const applyHospitalList = useCallback(
    async (gps: UserLocation | null | undefined, options?: { syncLookup?: boolean }) => {
      const { location: activeLocation, isGps } = resolveHospitalSearchLocation(gps);
      setSearchLocation(activeLocation);
      setUsedFallback(!isGps);

      const result = await hospitalService.findAllRanked(activeLocation);
      const list = result.data ?? [];
      setHospitals(list);

      if (!list.length) {
        setMessage(result.message || 'We could not load the hospital list.');
        return;
      }

      setMessage(
        !isGps
          ? 'Using PAGASA station reference — enable GPS in Tuguegarao for your exact nearest hospital.'
          : (result.message ?? null),
      );

      const top = list[0];
      if (options?.syncLookup && profile && top && isGps) {
        void databaseService.sync.syncHospitalLookup(profile, top, activeLocation);
      }
    },
    [profile],
  );

  const handleFindHospitals = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await applyHospitalList(location ?? locationService.getLastKnownLocation());
      void refreshLocation('hospital')
        .catch(() => undefined)
        .then(async () => {
          await applyHospitalList(locationService.getLastKnownLocation(), { syncLookup: true });
        });
    } catch {
      setMessage('Could not load hospitals. Tap refresh to try again.');
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [applyHospitalList, location, refreshLocation]);

  useEffect(() => {
    void handleFindHospitals();
  }, [handleFindHospitals]);

  if (!profile) return <Redirect href="/" />;

  async function handleNavigate(hospital: HospitalInfo) {
    const origin = searchLocation ?? location ?? {
      ...CITY_CENTER,
      retrievedAt: new Date().toISOString(),
    };
    setNavigatingId(hospital.id);
    try {
      const result = await hospitalService.openNavigation(hospital, origin);
      setMessage(result.message);
    } finally {
      setNavigatingId(null);
    }
  }

  async function handleCall(phone: string) {
    const normalized = phone.replace(/\s/g, '');
    await Linking.openURL(`tel:${normalized}`);
  }

  const gpsHint =
    locationStatus === 'denied'
      ? 'Location is off — enable it in Settings for accurate distances.'
      : usedFallback
        ? 'GPS off — distances use PAGASA station reference in Tuguegarao.'
        : null;

  return (
    <Screen
      title="Nearest hospitals"
      subtitle={`Major hospitals in ${TUGUEGARAO_STUDY_AREA.city} · sorted by distance`}
      back
      horizontalPadding={horizontalPadding}
      headerRight={
        <HeaderIconButton
          icon="refresh"
          onPress={handleFindHospitals}
          accessibilityLabel="Refresh hospital list"
        />
      }
    >
      <View style={styles.locationRow}>
        <View style={[styles.locationPill, usedFallback ? styles.locationPillMuted : styles.locationPillLive]}>
          <Ionicons
            name={usedFallback ? 'location-outline' : 'navigate'}
            size={14}
            color={usedFallback ? palette.textMuted : palette.primary}
          />
          <Text style={[styles.locationPillText, !usedFallback && styles.locationPillTextLive]}>
            {usedFallback ? 'City reference' : 'Using your location'}
          </Text>
        </View>
        {loading && hospitals.length > 0 ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : null}
      </View>

      {gpsHint ? (
        <Pressable
          onPress={() => void refreshLocation('hospital')}
          style={({ pressed }) => [styles.gpsBanner, pressed && styles.pressed]}
        >
          <Ionicons name="locate-outline" size={18} color={palette.primary} />
          <Text style={styles.gpsBannerText}>{gpsHint}</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.textLight} />
        </Pressable>
      ) : null}

      {loading && hospitals.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Finding hospitals near you…</Text>
        </View>
      ) : null}

      {!loading && hospitals.length === 0 ? (
        <EmptyState
          title="No hospitals found"
          message={message ?? "We couldn't load the hospital list. Try refreshing."}
          icon="medkit-outline"
          actionLabel="Try again"
          onAction={handleFindHospitals}
        />
      ) : null}

      {nearest ? (
        <View style={styles.nearestHero}>
          <LinearGradient
            colors={isDark ? ['#991B1B', '#DC2626'] : ['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.nearestHeroInner}>
            <View style={styles.nearestBadge}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.nearestBadgeText}>Nearest to you</Text>
            </View>
            <Text style={styles.nearestName}>{nearest.name}</Text>
            <Text style={styles.nearestAddress} numberOfLines={2}>{nearest.address}</Text>
            <View style={styles.nearestStats}>
              <StatPill icon="navigate-outline" label={`${nearest.distanceKm} km`} />
              {nearest.estimatedTravelTime ? (
                <StatPill icon="time-outline" label={nearest.estimatedTravelTime.replace('~', '')} />
              ) : null}
              <StatPill
                icon="business-outline"
                label={nearest.category === 'government' ? 'Government' : 'Private'}
              />
            </View>
            <View style={styles.nearestActions}>
              <Pressable
                onPress={() => void handleNavigate(nearest)}
                style={({ pressed }) => [styles.nearestBtnPrimary, pressed && styles.pressed]}
                disabled={navigatingId === nearest.id}
              >
                {navigatingId === nearest.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    <Text style={styles.nearestBtnPrimaryText}>Get directions</Text>
                  </>
                )}
              </Pressable>
              {nearest.phone ? (
                <Pressable
                  onPress={() => void handleCall(nearest.phone!)}
                  style={({ pressed }) => [styles.nearestBtnGhost, pressed && styles.pressed]}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                  <Text style={styles.nearestBtnGhostText}>Call</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {others.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>More hospitals</Text>
            <Text style={styles.sectionSubtitle}>{others.length} other options nearby</Text>
          </View>
          <View style={styles.menuCard}>
            {others.map((hospital, index) => (
              <HospitalRow
                key={hospital.id}
                hospital={hospital}
                isLast={index === others.length - 1}
                onNavigate={() => void handleNavigate(hospital)}
                onCall={hospital.phone ? () => void handleCall(hospital.phone!) : undefined}
                navigating={navigatingId === hospital.id}
                styles={styles}
                palette={palette}
              />
            ))}
          </View>
        </>
      ) : null}

      {message && hospitals.length > 0 ? (
        <Text style={styles.footerNote}>{message}</Text>
      ) : null}
    </Screen>
  );
}

function StatPill({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.95)" />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: '#FFFFFF' }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HospitalRow({
  hospital,
  isLast,
  onNavigate,
  onCall,
  navigating,
  styles,
  palette,
}: {
  hospital: HospitalInfo;
  isLast: boolean;
  onNavigate: () => void;
  onCall?: () => void;
  navigating: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
}) {
  const iconBg = hospital.category === 'government' ? palette.primarySoft : '#CCFBF1';

  return (
    <View style={[styles.menuRow, !isLast && styles.menuRowBorder]}>
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name="medkit-outline" size={18} color={palette.primary} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle} numberOfLines={2}>{hospital.name}</Text>
        <Text style={styles.menuSub} numberOfLines={2}>{hospital.address}</Text>
        <Text style={styles.menuMeta}>
          {hospital.distanceKm} km
          {hospital.estimatedTravelTime ? ` · ${hospital.estimatedTravelTime}` : ''}
        </Text>
      </View>
      <View style={styles.menuActions}>
        {onCall ? (
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityLabel={`Call ${hospital.name}`}
          >
            <Ionicons name="call-outline" size={16} color={palette.primary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onNavigate}
          disabled={navigating}
          style={({ pressed }) => [styles.directionsBtn, pressed && styles.pressed]}
          accessibilityLabel={`Directions to ${hospital.name}`}
        >
          {navigating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, isCompact: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    locationPillLive: {
      backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : p.primarySoft,
      borderColor: isDark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.2)',
    },
    locationPillMuted: {
      backgroundColor: p.surfaceMuted,
      borderColor: p.border,
    },
    locationPillText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.textMuted,
    },
    locationPillTextLive: {
      color: p.primary,
    },
    gpsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
    },
    gpsBannerText: {
      ...typography.caption,
      color: p.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    loadingWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.md,
    },
    loadingText: {
      ...typography.bodySm,
      color: p.textMuted,
    },
    nearestHero: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248,113,113,0.35)' : 'rgba(220,38,38,0.2)',
      ...shadow,
    },
    nearestHeroInner: {
      padding: isCompact ? spacing.lg : layout.cardPaddingLg,
      gap: spacing.sm,
    },
    nearestBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginBottom: spacing.xs,
    },
    nearestBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: '#FFFFFF',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    nearestName: {
      fontFamily: fonts.header,
      fontSize: isCompact ? 20 : 22,
      color: '#FFFFFF',
      letterSpacing: -0.4,
      lineHeight: 28,
    },
    nearestAddress: {
      ...typography.bodySm,
      color: 'rgba(255,255,255,0.9)',
      lineHeight: 20,
    },
    nearestStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    nearestActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    nearestBtnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    nearestBtnPrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#DC2626',
    },
    nearestBtnGhost: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)',
      minHeight: 48,
    },
    nearestBtnGhostText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    sectionHead: {
      marginBottom: spacing.sm,
      gap: 2,
    },
    sectionTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
    },
    menuCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      ...shadow,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    menuRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    menuIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    menuCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    menuTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
      lineHeight: 18,
    },
    menuSub: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 16,
    },
    menuMeta: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
      marginTop: 2,
    },
    menuActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    directionsBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerNote: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: 17,
    },
    pressed: { opacity: 0.88 },
  });
}
