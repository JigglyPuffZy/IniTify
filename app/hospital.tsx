import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  EmptyState,
} from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import {
  hospitalService,
  type HospitalInfo,
} from '@/src/services/hospital/hospital.service';
import { TUGUEGARAO_HOSPITAL_COUNT } from '@/src/data/tuguegarao-hospitals';
import { appConfig } from '@/src/config/app.config';
import { useState } from 'react';

export default function HospitalScreen() {
  const { profile, location } = useIniTify();
  const [message, setMessage] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [loading, setLoading] = useState(false);

  if (!profile) return <Redirect href="/" />;

  async function handleFindHospitals() {
    if (!location) {
      setMessage('Location unavailable. Enable GPS to find nearest hospitals.');
      setHospitals([]);
      return;
    }
    setLoading(true);
    try {
      const result = await hospitalService.findAllRanked(location);
      setMessage(result.message);
      setHospitals(result.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleNavigate(hospital: HospitalInfo) {
    if (!location) return;
    const result = await hospitalService.openNavigation(hospital, location);
    setMessage(result.message);
  }

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Hospital & Navigation">
        {!hospitalService.isConfigured() ? (
          <InfoBanner
            message="Set EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER=static-tuguegarao in .env and restart Expo."
            variant="warning"
          />
        ) : (
          <InfoBanner
            message={`${TUGUEGARAO_HOSPITAL_COUNT} major hospitals in Tuguegarao City (government + private)`}
            variant="info"
          />
        )}

        {!appConfig.mapsProvider ? (
          <InfoBanner
            message="Set EXPO_PUBLIC_MAPS_PROVIDER=google in .env for turn-by-turn navigation."
            variant="warning"
          />
        ) : (
          <InfoBanner
            message={`Navigation: ${appConfig.mapsProvider} maps`}
            variant="info"
          />
        )}

        {!location ? (
          <EmptyState message="GPS location is required for hospital identification and navigation." />
        ) : (
          <Text style={styles.location}>
            Your location: {location.latitude.toFixed(4)},{' '}
            {location.longitude.toFixed(4)}
          </Text>
        )}

        <PrimaryButton
          label={loading ? 'Finding...' : 'Find Hospitals Near Me'}
          onPress={handleFindHospitals}
          disabled={loading || !location}
        />

        {hospitals.map((hospital) => (
          <View
            key={hospital.id}
            style={[styles.card, hospital.isNearest ? styles.cardNearest : null]}
          >
            {hospital.isNearest ? (
              <Text style={styles.nearestBadge}>Nearest</Text>
            ) : null}
            <Text style={styles.hospitalName}>{hospital.name}</Text>
            <Text style={styles.hospitalDetail}>{hospital.address}</Text>
            <Text style={styles.hospitalDetail}>
              {hospital.category === 'government' ? 'Government' : 'Private'}
              {hospital.phone ? ` · ${hospital.phone}` : ''}
            </Text>
            <Text style={styles.hospitalDetail}>
              Distance: {hospital.distanceKm} km
              {hospital.estimatedTravelTime ? ` · ${hospital.estimatedTravelTime}` : ''}
            </Text>
            <PrimaryButton
              label="Open Navigation"
              onPress={() => handleNavigate(hospital)}
              disabled={!appConfig.mapsProvider}
            />
          </View>
        ))}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <InfoBanner
          message="Major hospitals in Tuguegarao City for heat-emergency guidance. Not every clinic is listed — confirm with local authorities in a real emergency."
          variant="info"
        />
      </ScreenContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  location: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cardNearest: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  nearestBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  hospitalDetail: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
});
