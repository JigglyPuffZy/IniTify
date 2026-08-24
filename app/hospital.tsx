import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { HeaderIconButton } from '@/src/components/layout/PageMasthead';
import { EmptyState, SectionHeader, SurfaceCard } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import { hospitalService, type HospitalInfo } from '@/src/services/hospital/hospital.service';
import { locationService } from '@/src/services/location/location.service';
import { databaseService } from '@/src/services/database/database.service';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { useResponsive } from '@/src/utils/responsive';
import { radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';
import type { UserLocation } from '@/src/models/location';

const CITY_CENTER: UserLocation = {
  latitude: TUGUEGARAO_STUDY_AREA.latitude,
  longitude: TUGUEGARAO_STUDY_AREA.longitude,
  accuracy: null,
  retrievedAt: new Date(0).toISOString(),
};

export default function HospitalScreen() {
  const { profile, location, locationStatus, refreshLocation } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [searchLocation, setSearchLocation] = useState<UserLocation | null>(location);

  const handleFindHospitals = useCallback(async () => {
    setLoading(true);
    try {
      await refreshLocation('hospital');
      // locationService is updated synchronously by refreshLocation.
      const fresh = locationService.getLastKnownLocation();
      const isFallback = !fresh;
      const activeLocation = fresh ?? {
        ...CITY_CENTER,
        retrievedAt: new Date().toISOString(),
      };

      setSearchLocation(activeLocation);
      setUsedFallback(isFallback);

      const result = await hospitalService.findAllRanked(activeLocation);
      setMessage(
        isFallback
          ? 'Location unavailable — distances are from Tuguegarao city center. Turn on GPS for accurate nearest hospital.'
          : (result.message ?? null),
      );
      setHospitals(result.data ?? []);
      const nearest = result.data?.[0];
      if (profile && nearest && !isFallback) {
        void databaseService.sync.syncHospitalLookup(profile, nearest, activeLocation);
      }
    } finally {
      setLoading(false);
    }
  }, [profile, refreshLocation]);

  useEffect(() => {
    void handleFindHospitals();
  }, [handleFindHospitals]);

  if (!profile) return <Redirect href="/" />;

  async function handleNavigate(hospital: HospitalInfo) {
    const origin = searchLocation ?? location ?? {
      ...CITY_CENTER,
      retrievedAt: new Date().toISOString(),
    };
    const result = await hospitalService.openNavigation(hospital, origin);
    setMessage(result.message);
  }

  const gpsHint =
    locationStatus === 'denied'
      ? 'Location permission is off. Enable it in Settings for accurate distances.'
      : usedFallback
        ? 'Using city-center estimate — enable GPS for your true nearest hospital.'
        : null;

  return (
    <Screen
      overline={TUGUEGARAO_STUDY_AREA.label}
      title="Hospitals"
      subtitle="Major hospitals near you, sorted by distance"
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
      {gpsHint ? (
        <View style={styles.gpsBanner}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.gpsBannerText}>{gpsHint}</Text>
        </View>
      ) : null}

      {!loading && hospitals.length === 0 ? (
        <EmptyState
          title="No hospitals found"
          message="We couldn't load the hospital list. Try refreshing."
          icon="medkit-outline"
          actionLabel="Try again"
          onAction={handleFindHospitals}
        />
      ) : null}

      {hospitals.length ? (
        <View>
          <SectionHeader
            title={`${hospitals.length} hospitals`}
            subtitle={loading ? 'Updating list…' : 'Closest first'}
          />
          <View style={styles.list}>
            {hospitals.map((hospital) => (
              <SurfaceCard
                key={hospital.id}
                style={hospital.isNearest ? styles.nearest : undefined}
              >
                <View style={styles.cardHead}>
                  <View
                    style={[
                      styles.avatar,
                      hospital.category === 'government'
                        ? styles.avatarGov
                        : styles.avatarPrivate,
                    ]}
                  >
                    <Ionicons
                      name="medkit"
                      size={18}
                      color={hospital.category === 'government' ? colors.primary : colors.teal}
                    />
                  </View>
                  <View style={styles.cardHeadText}>
                    <Text style={styles.hospitalName}>{hospital.name}</Text>
                    <Text style={styles.hospitalDetail} numberOfLines={2}>
                      {hospital.address}
                    </Text>
                  </View>
                  {hospital.isNearest ? (
                    <Text style={styles.nearestBadge}>Nearest</Text>
                  ) : null}
                </View>

                <View style={styles.chips}>
                  <Chip styles={styles} colors={colors} icon="navigate-outline" text={`${hospital.distanceKm} km`} />
                  {hospital.estimatedTravelTime ? (
                    <Chip styles={styles} colors={colors} icon="time-outline" text={hospital.estimatedTravelTime} />
                  ) : null}
                  <Chip
                    styles={styles}
                    colors={colors}
                    icon="business-outline"
                    text={hospital.category === 'government' ? 'Government' : 'Private'}
                  />
                  {hospital.phone ? <Chip styles={styles} colors={colors} icon="call-outline" text={hospital.phone} /> : null}
                </View>

                <Button
                  label="Get directions"
                  variant="ghost"
                  onPress={() => handleNavigate(hospital)}
                  icon="navigate"
                />
              </SurfaceCard>
            ))}
          </View>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Screen>
  );
}

function Chip({
  icon,
  text,
  colors,
  styles,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  colors: LegacyThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  gpsBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  list: { gap: spacing.md },
  nearest: { borderColor: colors.primary, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGov: { backgroundColor: colors.primarySoft },
  avatarPrivate: { backgroundColor: colors.tealSoft },
  cardHeadText: { flex: 1, minWidth: 0 },
  nearestBadge: {
    ...typography.overline,
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  hospitalName: { ...typography.h3, color: colors.text, fontSize: 15 },
  hospitalDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  message: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  });
}
