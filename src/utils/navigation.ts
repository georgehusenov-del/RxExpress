import { Linking, Platform } from 'react-native';
import type { Delivery } from '@/types/api';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export function formatDeliveryAddress(delivery: Delivery): string {
  const streetLine = [delivery.street, delivery.aptUnit].filter(Boolean).join(', ');
  const cityStateZip = [
    delivery.city,
    [delivery.state, delivery.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  return [streetLine, cityStateZip].filter(Boolean).join(', ');
}

export function isValidCoordinate(lat?: number | string | null, lng?: number | string | null): boolean {
  if (lat == null || lng == null) return false;

  const numericLat = Number(lat);
  const numericLng = Number(lng);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return false;
  if (numericLat === 0 && numericLng === 0) return false;
  if (Math.abs(numericLat) < 0.001 && Math.abs(numericLng) < 0.001) return false;
  if (Math.abs(numericLat) > 90 || Math.abs(numericLng) > 180) return false;

  return true;
}

function hasTrustedCoordinates(delivery: Delivery): boolean {
  const meta = delivery as Delivery & {
    coordinatesTrusted?: boolean;
    coordinatesAreTrusted?: boolean;
    coordinateSource?: string;
    geocodeSource?: string;
  };
  const source = String(meta.coordinateSource ?? meta.geocodeSource ?? '').toLowerCase();

  return Boolean(
    meta.coordinatesTrusted ||
      meta.coordinatesAreTrusted ||
      ['patient', 'patient_address', 'delivery', 'delivery_address', 'verified', 'exact'].includes(source)
  );
}

export async function openNavigationForDelivery(delivery: Delivery): Promise<void> {
  const address = formatDeliveryAddress(delivery);
  const encoded = encodeURIComponent(address);
  const coordsValid = isValidCoordinate(delivery.latitude, delivery.longitude);
  const coordsTrusted = hasTrustedCoordinates(delivery);
  const useCoords = coordsValid && coordsTrusted;
  const destination = useCoords ? `${delivery.latitude},${delivery.longitude}` : encoded;

  const primaryUrl =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=d`
      : `google.navigation:q=${destination}`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  if (isDev) {
    console.log('[Nav] id:', delivery.id);
    console.log('[Nav] address:', address);
    console.log(
      '[Nav] coordinates:',
      delivery.latitude,
      delivery.longitude,
      useCoords ? 'USING trusted coords' : `SKIPPED - valid=${coordsValid} trusted=${coordsTrusted}`
    );
    console.log('[Nav] url:', primaryUrl);
  }

  try {
    const supported = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(supported ? primaryUrl : fallbackUrl);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}

export function sanitizePhone(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `${prefix}${trimmed.replace(/[^\d]/g, '')}`;
}
