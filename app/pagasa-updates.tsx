import { Redirect } from 'expo-router';

/** Keeps old /pagasa-updates links working */
export default function PagasaUpdatesRedirect() {
  return <Redirect href="/(tabs)/home" />;
}
