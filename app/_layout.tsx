import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IniTifyProvider } from '@/src/context/IniTifyContext';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { EmergencyActiveMonitor } from '@/src/components/EmergencyActiveMonitor';
import { NotificationReminderHandler } from '@/src/components/NotificationReminderHandler';
import { useAppTheme } from '@/src/theme/useAppTheme';

export { ErrorBoundary } from 'expo-router';

function ThemedStack() {
  const { palette } = useAppTheme();

  return (
    <>
      <StatusBar style={palette.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="pagasa-updates" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="recommendations" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="hospital" />
        <Stack.Screen name="offline" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="check-in-history" />
        <Stack.Screen name="health-profile" />
        <Stack.Screen name="emergency-contact" />
        <Stack.Screen name="reminder-settings" />
        <Stack.Screen name="safety-tips" />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not found' }} />
      </Stack>
    </>
  );
}

function AppRoot() {
  const { user } = useAuth();
  const { palette } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {user ? <EmergencyActiveMonitor /> : null}
      {user ? <NotificationReminderHandler /> : null}
      <ThemedStack />
    </View>
  );
}

export default function RootLayout() {
  const [, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <IniTifyProvider>
            <AppRoot />
          </IniTifyProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
