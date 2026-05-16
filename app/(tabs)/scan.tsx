import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLogo } from '@/components/AppLogo';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';

type FoundPackage = { id: number; orderNumber: string; recipientName: string } | null;

export default function ScanScreen() {
  const { user, loading } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState('Ready to scan');
  const [foundPackage, setFoundPackage] = useState<FoundPackage>(null);

  if (loading) return <Screen contentContainerStyle={styles.center}><Text>Loading...</Text></Screen>;
  if (!user) return <Redirect href="/login" />;

  if (!permission) {
    return <Screen contentContainerStyle={styles.center}><Text>Checking camera permission...</Text></Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen contentContainerStyle={styles.permissionWrap}>
        <Card>
          <SectionTitle title="Camera Access Required" subtitle="Allow camera access to scan package QR codes" />
          <PrimaryButton title="Allow Camera" onPress={requestPermission} />
        </Card>
      </Screen>
    );
  }

  async function resolveCode(rawData: string) {
    setBusy(true);
    setFoundPackage(null);
    setScanStatus('Verifying package...');

    try {
      let pkg: FoundPackage = null;
      try {
        const result = await rxexApi.scanQr(rawData);
        if (result.verified && result.package) {
          pkg = {
            id: result.package.id,
            orderNumber: result.package.orderNumber,
            recipientName: result.package.recipientName,
          };
        }
      } catch {
        const result = await rxexApi.deliveries();
        const lastSegment = rawData.includes('/') ? rawData.split('/').filter(Boolean).pop() ?? rawData : rawData;
        const match = result.deliveries.find(item => [item.qrCode, item.orderNumber, item.trackingNumber].includes(rawData) || [item.qrCode, item.orderNumber, item.trackingNumber].includes(lastSegment));
        if (match) {
          pkg = { id: match.id, orderNumber: match.orderNumber, recipientName: match.recipientName };
        }
      }

      if (!pkg) {
        setScanStatus('Package not found');
        Alert.alert('Scan failed', 'This QR code does not match any of your active deliveries.');
        return;
      }

      setFoundPackage(pkg);
      setScanStatus('Package verified');
    } catch (e: any) {
      setScanStatus('Verification failed');
      Alert.alert('Scan failed', e?.message || 'Unable to verify this package right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
        onBarcodeScanned={busy || foundPackage ? undefined : ({ data }) => resolveCode(data)}
      />

      <View style={styles.overlay}>
        <View style={styles.topCopy}>
          <AppLogo size="small" />
          <Text style={styles.header}>Scan Package QR</Text>
          <Text style={styles.instructions}>Place the package QR code inside the frame</Text>
        </View>

        <View style={styles.scanFrameWrap}>
          <View style={styles.scanFrame} />
        </View>

        <Card style={styles.bottomCard}>
          <Text style={styles.statusLabel}>Scan status</Text>
          <Text style={styles.statusText}>{scanStatus}</Text>

          {foundPackage ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="check-decagram" size={22} color={colors.success} />
                <Text style={styles.resultTitle}>Package verified</Text>
              </View>
              <Text style={styles.resultMeta}>{foundPackage.orderNumber}</Text>
              <Text style={styles.resultMeta}>{foundPackage.recipientName}</Text>
              <PrimaryButton title="Open Delivery" onPress={() => router.push(`/deliveries/${foundPackage.id}`)} style={styles.resultButton} />
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
                <PrimaryButton title="Verify Manually" variant="outline" onPress={() => resolveCode(manualCode)} disabled={!manualCode.trim() || busy} style={styles.manualButton} />
                <Pressable onPress={() => { setScanStatus('Ready to scan'); setFoundPackage(null); }}>
                  <Text style={styles.tryAgainText}>Try Again</Text>
                </Pressable>
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
  permissionWrap: { justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 26, backgroundColor: 'rgba(2,17,21,0.38)' },
  topCopy: { alignItems: 'center' },
  header: { marginTop: 16, fontSize: 28, lineHeight: 34, fontWeight: '900', color: '#FFFFFF' },
  instructions: { marginTop: 6, color: '#D8F3F7', fontSize: 14, textAlign: 'center' },
  scanFrameWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  scanFrame: { width: 256, height: 256, borderWidth: 3, borderColor: '#C6FBFF', borderRadius: 28, backgroundColor: 'transparent', shadowColor: '#80F5FF', shadowOpacity: 0.4, shadowRadius: 20 },
  bottomCard: { backgroundColor: 'rgba(255,255,255,0.96)' },
  statusLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusText: { marginTop: 4, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.navy },
  resultCard: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: '#F5FFFA', borderWidth: 1, borderColor: '#D1FAE5' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { color: colors.success, fontWeight: '900', fontSize: 18 },
  resultMeta: { marginTop: 8, color: colors.navy, fontWeight: '700' },
  resultButton: { marginTop: 14 },
  manualInputWrap: { marginTop: 16 },
  manualActions: { marginTop: 12, gap: 10 },
  manualButton: { backgroundColor: '#FFFFFF' },
  tryAgainText: { textAlign: 'center', fontWeight: '700', color: colors.primaryDark },
});