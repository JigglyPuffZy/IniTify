import { Redirect } from 'expo-router';

/** Legacy route — notifications live in the Notifications tab. */
export default function AlertsScreen() {
  return <Redirect href="/(tabs)/notifications" />;
}
