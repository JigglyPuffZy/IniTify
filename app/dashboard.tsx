import { Redirect } from 'expo-router';

/** Keeps old /dashboard links working */
export default function DashboardRedirect() {
  return <Redirect href="/home" />;
}
