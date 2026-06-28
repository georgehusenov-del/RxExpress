import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import { getContentMaxWidth, getHorizontalPadding, isTabletWidth } from '@/utils/responsive';

type FoundPackage = {
  id: number;
  orderNumber: string;
  recipientName: string;
  alreadyScanned: boolean; // true if package was already in picked_up or higher
} | null;

const ALREADY_SCANNED_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery', 'delivering_now', 'delivered', 'completed'];

export default function ScanScreen() {
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState('Ready to scan');
  const [foundPackage, setFoundPackage] = useState<FoundPackage>(null);
  const tablet = isTabletWidth(width);
  const horizontalPadding = getHorizontalPadding(width);
  const contentMaxWidth = getContentMaxWidth(width, 560);
  const frameSize = tablet ? 320 : 256;

  if (loading) return <Screen contentContainerStyle={styles.center}><Text>Loading...</Text></Screen>;
  if (!user) return <Redirect href="/login" />;

  if (!permission) {
    return <Screen contentContainerStyle={styles.center}><Text>Checking camera permission...</Text></Screen>;
  }

  if (!permission.granted) {
    const denied = !permission.canAskAgain && permission.status === 'denied';
    return (
      <Screen contentContainerStyle={[styles.permissionWrap, { paddingHorizontal: horizontalPadding }]}>
        <Card style={[styles.permissionCard, { maxWidth: contentMaxWidth }]}>
          {denied ? (
            <>
              <SectionTitle title="Camera Access Disabled" subtitle="Enable camera in Settings to scan QR codes." />
              <PrimaryButton title="Open Settings" onPress={() => Linking.openSettings()} />
            </>
          ) : (
            <>
              <SectionTitle title="Scan Package QR Codes" subtitle="Camera access is needed to scan package QR codes." />
              <PrimaryButton title="Enable Camera" onPress={requestPermission} />
            </>
          )}
        </Card>
      </Screen>
    );
  }

  async function resolveCode(rawData: string) {
    const code = rawData.trim();
    if (!code) return;
    setBusy(true);
    setFoundPackage(null);
    setScanStatus('Verifying package…');

    try {
      let pkg: FoundPackage = null;

      try {
        // Primary: backend scan API
        const result = await rxexApi.scanQr(code);
        if (result.verified && result.package) {
          const wasAlreadyScanned = ALREADY_SCANNED_STATUSES.includes(result.package.status);
          pkg = {
            id: result.package.id,
            orderNumber: result.package.orderNumber,
            recipientName: result.package.recipientName,
            alreadyScanned: wasAlreadyScanned,
          };
          // Always update to PICKED_UP — idempotent on the backend
          await rxexApi.updateDeliveryStatus(result.package.id, 'picked_up').catch(() => null);
        }
      } catch {
        // Fallback: match locally from route
        const routeResult = await rxexApi.myRoute() as any;
        const stops: any[] = (routeResult.stops ?? routeResult.deliveries ?? []).map((s: any) => ({
          ...s, id: s.id ?? s.orderId,
        }));
        const lastSegment = code.includes('/') ? code.split('/').filter(Boolean).pop() ?? code : code;
        const match = stops.find((s: any) =>
          [s.qrCode, s.orderNumber, s.trackingNumber].includes(code) ||
          [s.qrCode, s.orderNumber, s.trackingNumber].includes(lastSegment)
        );
        if (match) {
          const wasAlreadyScanned = ALREADY_SCANNED_STATUSES.includes(match.status);
          pkg = {
            id: match.id,
            orderNumber: match.orderNumber,
            recipientName: match.recipientName,
            alreadyScanned: wasAlreadyScanned,
          };
          // Always update to PICKED_UP
          await rxexApi.updateDeliveryStatus(match.id, 'picked_up').catch(() => null);
        }
      }

      if (!pkg) {
        setScanStatus('Package not found');
        Alert.alert('Scan failed', 'This code does not match any of your active deliveries.');
        return;
      }

      setFoundPackage(pkg);
      setScanStatus(pkg.alreadyScanned ? 'Already scanned' : 'Package verified — marked Picked Up');
    } catch (e: any) {
      setScanStatus('Verification failed');
      Alert.alert('Scan failed', e?.message || 'Unable to verify this package right now.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setScanStatus('Ready to scan');
    setFoundPackage(null);
    setManualCode('');
  }

  return (
    <View style={styles.page}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
        onBarcodeScanned={busy || foundPackage ? undefined : ({ data }) => resolveCode(data)}
      />

      <View style={[styles.overlay, { paddingHorizontal: horizontalPadding, paddingTop: tablet ? 34 : 24 }]}>
        {/* Top */}
        <View style={styles.topCopy}>
          <Text style={styles.header}>Scan Package</Text>
          <Text style={styles.instructions}>Point the camera at the package QR code</Text>
        </View>

        {/* Scan frame */}
        <View style={styles.scanFrameWrap}>
          <View style={[styles.scanFrame, { width: frameSize, height: frameSize }]} />
          {busy && (
            <View style={styles.scanBusyOverlay}>
              <Text style={styles.scanBusyText}>Verifying…</Text>
            </View>
          )}
        </View>

        {/* Bottom card */}
        <Card style={[styles.bottomCard, { maxWidth: contentMaxWidth }]}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusText}>{scanStatus}</Text>

          {foundPackage ? (
            <View style={[styles.resultCard, foundPackage.alreadyScanned && styles.resultCardWarning]}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons
                  name={foundPackage.alreadyScanned ? 'information' : 'check-decagram'}
                  size={22}
                  color={foundPackage.alreadyScanned ? colors.warning : colors.success}
                />
                <Text style={[styles.resultTitle, foundPackage.alreadyScanned && styles.resultTitleWarning]}>
                  {foundPackage.alreadyScanned ? 'Package already scanned' : 'Marked as Picked Up'}
                </Text>
              </View>

              {foundPackage.alreadyScanned && (
                <View style={styles.alreadyScannedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.warning} />
                  <Text style={styles.alreadyScannedText}>Previously scanned — status already set to Picked Up</Text>
                </View>
              )}

              <Text style={styles.resultOrder}>{foundPackage.orderNumber}</Text>
              <Text style={styles.resultRecipient}>{foundPackage.recipientName}</Text>

              <View style={styles.resultActions}>
                <PrimaryButton
                  title="Open Delivery"
                  onPress={() => router.push(`/delivery/${foundPackage.id}`)}
                  style={styles.resultBtn}
                />
                <Pressable onPress={reset} style={styles.scanAgainBtn}>
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primaryDark} />
                  <Text style={styles.scanAgainText}>Scan Another</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <InputField
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter QR or tracking code manually"
                icon="barcode-scan"
                containerStyle={styles.manualInputWrap}
              />
              <View style={styles.manualActions}>
                <PrimaryButton
                  title="Verify Code"
                  variant="outline"
                  onPress={() => resolveCode(manualCode)}
                  disabled={!manualCode.trim() || busy}
                  style={styles.manualButton}
                />
                {scanStatus !== 'Ready to scan' && (
                  <Pressable onPress={reset}>
                    <Text style={styles.tryAgainText}>Reset</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#04181C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionWrap: { justifyContent: 'center', alignItems: 'center' },
  permissionCard: { width: '100%' },

  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 26,
    backgroundColor: 'rgba(2,17,21,0.38)',
  },
  topCopy: { alignItems: 'center', paddingTop: 8 },
  header: { marginTop: 8, fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  instructions: { marginTop: 6, color: '#D8F3F7', fontSize: 14, textAlign: 'center' },

  scanFrameWrap: { alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' },
  scanFrame: {
    borderWidth: 3, borderColor: '#C6FBFF', borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#80F5FF', shadowOpacity: 0.4, shadowRadius: 20,
  },
  scanBusyOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,76,85,0.85)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  scanBusyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  bottomCard: { backgroundColor: 'rgba(255,255,255,0.97)', width: '100%', alignSelf: 'center' },
  statusLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { marginTop: 4, fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 2 },

  // Result
  resultCard: {
    marginTop: 12, padding: 14, borderRadius: 16,
    backgroundColor: '#F5FFFA', borderWidth: 1, borderColor: '#D1FAE5',
  },
  resultCardWarning: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultTitle: { color: colors.success, fontWeight: '900', fontSize: 16 },
  resultTitleWarning: { color: '#92400E' },
  alreadyScannedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF9C3', borderRadius: 8, padding: 8, marginBottom: 8,
  },
  alreadyScannedText: { color: '#92400E', fontSize: 12, fontWeight: '700', flex: 1 },
  resultOrder: { color: colors.navy, fontWeight: '900', fontSize: 17, marginBottom: 2 },
  resultRecipient: { color: colors.muted, fontWeight: '700', fontSize: 14, marginBottom: 12 },
  resultActions: { gap: 8 },
  resultBtn: {},
  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  scanAgainText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },

  // Manual
  manualInputWrap: { marginTop: 12 },
  manualActions: { marginTop: 10, gap: 8 },
  manualButton: { backgroundColor: '#FFFFFF' },
  tryAgainText: { textAlign: 'center', fontWeight: '700', color: colors.primaryDark, paddingVertical: 4 },
});
