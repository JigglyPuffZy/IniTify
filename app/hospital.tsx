import { ScrollView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  EmptyState,
} from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import { hospitalService } from '@/src/services/hospital/hospital.service';
import { appConfig } from '@/src/config/app.config';
import { useState } from 'react';

export default function HospitalScreen() {
  const { profile, location } = useIniTify();
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return <Redirect href="/" />;

  async function handleFindHospital() {
    if (!location) {
      setMessage('Location unavailable. Enable GPS to find nearest hospital.');
      return;
    }
    const result = await hospitalService.findNearest(location);
    setMessage(result.message);
  }

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Hospital & Navigation">
        {!hospitalService.isConfigured() ? (
          <InfoBanner
            message="Hospital data provider is not configured. Set EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER. No hospitals are listed — data is not invented."
            variant="warning"
          />
        ) : null}

        {!appConfig.mapsProvider ? (
          <InfoBanner
            message="Navigation service is not configured. Set EXPO_PUBLIC_MAPS_PROVIDER."
            variant="warning"
          />
        ) : null}

        {!location ? (
          <EmptyState message="GPS location is required for hospital identification and navigation." />
        ) : (
          <Text style={styles.location}>
            Your location: {location.latitude.toFixed(4)},{' '}
            {location.longitude.toFixed(4)}
          </Text>
        )}

        <PrimaryButton label="Find Nearest Hospital" onPress={handleFindHospital} />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <InfoBanner
          message="Real-time hospital navigation requires an active internet connection and a configured mapping service."
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
  message: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
});
