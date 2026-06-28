import { Redirect } from 'expo-router';

// The home tab is no longer in the bottom navigation.
// Redirect any direct visits to the deliveries tab.
export default function HomeRedirect() {
  return <Redirect href="/deliveries" />;
}
