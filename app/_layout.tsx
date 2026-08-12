import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { IniTifyProvider } from '@/src/context/IniTifyContext';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <IniTifyProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#006AB1' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'IniTify', headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'User Setup' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Heat-Risk Dashboard' }} />
        <Stack.Screen name="assessment" options={{ title: 'Risk Assessment' }} />
        <Stack.Screen name="recommendations" options={{ title: 'Recommendations' }} />
        <Stack.Screen name="alerts" options={{ title: 'Alerts' }} />
        <Stack.Screen name="emergency" options={{ title: 'Emergency Assistance' }} />
        <Stack.Screen name="hospital" options={{ title: 'Hospital & Navigation' }} />
        <Stack.Screen name="offline" options={{ title: 'Offline Data' }} />
      </Stack>
    </IniTifyProvider>
  );
}
