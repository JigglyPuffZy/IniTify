import { Redirect } from 'expo-router';

/** Merged into /safety-tips — keeps old links working */
export default function RecommendationsRedirect() {
  return <Redirect href="/safety-tips" />;
}
