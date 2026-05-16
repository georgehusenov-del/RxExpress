import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

export async function captureBase64Photo(label: string): Promise<string> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Camera permission is required.');

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.5,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) throw new Error(`${label} photo was not captured.`);

  const manipulated = await manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 960 } }],
    { compress: 0.35, format: SaveFormat.JPEG, base64: false }
  );

  const encodedFile = new File(manipulated.uri);
  let b64 = await encodedFile.base64();
  if (!b64) throw new Error(`${label} photo could not be encoded.`);

  // Fix URL-safe base64 chars (- -> +, _ -> /) that break .NET Convert.FromBase64String
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const rem = b64.length % 4;
  if (rem === 2) b64 += '==';
  else if (rem === 3) b64 += '=';

  console.log(`[Photo ${label}] ${b64.length} chars (~${Math.round(b64.length * 0.75 / 1024)} KB)`);
  return `data:image/jpeg;base64,${b64}`;
}
