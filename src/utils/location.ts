import * as Location from 'expo-location';
import { rxexApi } from '@/api/rxexApi';

let subscription: Location.LocationSubscription | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

export async function requestLocationPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Location permission is required.');
  return true;
}

export async function startGpsLoop() {
  await requestLocationPermissions();
  await stopGpsLoop();
  const send = async () => {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await rxexApi.location({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      accuracy: loc.coords.accuracy
    });
  };
  await send().catch(() => null);
  interval = setInterval(() => send().catch(() => null), 15000);
}

export async function stopGpsLoop() {
  if (interval) clearInterval(interval);
  interval = null;
  if (subscription) subscription.remove();
  subscription = null;
}

export async function getCurrentCoordinates() {
  await requestLocationPermissions();
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}
