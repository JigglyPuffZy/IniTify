import { View, Text, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { LoadingState } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function EntryScreen() {
  const router = useRouter();
  const { profile, isLoading } = useIniTify();

  if (isLoading) {
    return <LoadingState message="Starting IniTify..." />;
  }

  if (profile) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>IniTify</Text>
        <Text style={styles.tagline}>
          AI-assisted heat-risk monitoring and personalized alerts
        </Text>
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </View>
      <PrimaryButton
        label="Get Started"
        onPress={() => router.push('/setup')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#006AB1',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#dbeafe',
    lineHeight: 24,
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: '#93c5fd',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
