import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import type { Delivery } from '@/types/api';

type WorkflowStep = 'arriving' | 'scanning' | 'completing';

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const scanFrameSize = Math.round(width * 0.78);
  const [pickup, setPickup] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WorkflowStep>('arriving');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const result = await rxexApi.myRoute();
      const raw = result as any;
      const allStops: any[] = (raw.stops ?? raw.deliveries ?? []).map((s: any) => ({ ...s, id: s.id ?? s.orderId }));
      const found = allStops.find((d: any) => String(d.id) === id);
      if (!found) {
        Alert.alert('Pickup not found', 'This pickup could not be found.');
        router.back();
        return;
      }
      setPickup(found);
      // If already picked up, skip straight to done view
      if (['picked_up', 'in_transit'].includes(found.status)) {
        setStep('completing');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to load pickup details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function openDirections() {
    if (!pickup) return;
    const addr = [pickup.street, pickup.city, pickup.state, pickup.postalCode]
      .filter(Boolean)
      .join(', ');
    if (pickup.latitude && pickup.longitude) {
      const coord = `${pickup.latitude},${pickup.longitude}`;
      const url = Platform.select({
        ios: `maps://app?daddr=${coord}`,
        android: `geo:${coord}?q=${coord}`,
      });
      Linking.openURL(url ?? `https://maps.google.com/?q=${coord}`).catch(() =>
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`)
      );
    } else {
      const url = Platform.select({
        ios: `maps://app?daddr=${encodeURIComponent(addr)}`,
        android: `geo:0,0?q=${encodeURIComponent(addr)}`,
      });
      Linking.openURL(url ?? `https://maps.google.com/?q=${encodeURIComponent(addr)}`);
    }
  }

  function handleStartPickup() {
    if (!permission?.granted) {
      requestPermission().then(result => {
        if (result.granted) setStep('scanning');
        else Alert.alert('Camera required', 'Camera access is needed to scan packages.');
      });
      return;
    }
    setStep('scanning');
  }

  async function handleScanCode(rawCode: string) {
    if (scanLockRef.current || scanBusy || !pickup) return;

    const code = rawCode.trim();
    if (!code) return;

    if (scannedCodes.includes(code)) {
      // Duplicate scan — keep part green, no alert, no duplicate event
      Vibration.vibrate(40);
      setLastScanned(code);
      return;
    }

    scanLockRef.current = true;
    setScanBusy(true);

    try {
      // Use driver portal scan-code endpoint with scanType: pickup
      const result = await rxexApi.scanCode(pickup.id, {
        scanType: 'pickup',
        scannedCode: code,
      });

      Vibration.vibrate(80);
      recordScan(result.scannedCode ?? code);

      if (result.allScanned) {
        // Backend auto-transitioned to picked_up — go to done step
        setStep('completing');
        await load();
      } else if (result.missingCodes && result.missingCodes.length > 0) {
        // Show remaining codes hint — no alert, counter updates
      }
    } catch (e: any) {
      const msg: string = e.message || '';
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('do not scan the main order qr') || msgLower.includes('scan the package qr') || msgLower.includes('part label') || msgLower.includes('package-part')) {
        Alert.alert('Wrong QR Code', 'Please scan the physical package-part label.');
      } else if (msgLower.includes('does not belong') || msgLower.includes('not belong to this order') || msgLower.includes('wrong order')) {
        Alert.alert('Wrong QR Code', 'This package does not belong to this order or scan step.');
      } else if (msgLower.includes('already scanned') || msgLower.includes('already verified') || msgLower.includes('already been scanned')) {
        // Duplicate returned from backend — keep green, no alert
        recordScan(code);
      } else {
        Alert.alert('Scan failed', msg || 'Package not recognised. Try again.');
      }
    } finally {
      setScanBusy(false);
      setTimeout(() => { scanLockRef.current = false; }, 800);
    }
  }

  function recordScan(code: string) {
    setScannedCodes(prev => [...prev, code]);
    setLastScanned(code);
    setManualCode('');
  }

  async function handleDone() {
    if (!pickup) return;
    setCompleting(true);
    try {
      // For legacy orders (no packages), manually mark picked_up
      await rxexApi.updateDeliveryStatus(pickup.id, 'picked_up');
      setStep('completing');
      await load();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to complete pickup. Try again.');
    } finally {
      setCompleting(false);
    }
  }

  if (loading || !pickup) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const expectedCount = pickup.expectedPackageCount ?? null;
  const scannedCount = scannedCodes.length;
  const allScanned = expectedCount != null ? scannedCount >= expectedCount : false;
  const progressRatio = expectedCount ? Math.min(scannedCount / expectedCount, 1) : 0;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{pickup.pharmacyName}</Text>
          <Text style={styles.headerSub}>
            {pickup.street}, {pickup.city}
          </Text>
        </View>
        <StatusBadge status={pickup.status} />
      </View>

      {/* Step: Arriving */}
      {step === 'arriving' && (
        <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.infoCard}>
            <Text style={styles.infoLabel}>PHARMACY</Text>
            <Text style={styles.infoValue}>{pickup.pharmacyName}</Text>
            <Text style={styles.infoAddr}>
              {pickup.street}{pickup.aptUnit ? `, ${pickup.aptUnit}` : ''}
            </Text>
            <Text style={styles.infoAddr}>
              {pickup.city}, {pickup.state} {pickup.postalCode}
            </Text>

            {expectedCount != null && (
              <View style={styles.expectedRow}>
                <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primaryDark} />
                <Text style={styles.expectedText}>
                  Expected Packages: <Text style={styles.expectedNum}>{expectedCount}</Text>
                </Text>
              </View>
            )}

            {pickup.timeWindow ? (
              <View style={styles.timeRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.muted} />
                <Text style={styles.timeText}>{pickup.timeWindow}</Text>
              </View>
            ) : null}

            {pickup.deliveryNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{pickup.deliveryNotes}</Text>
              </View>
            ) : null}
          </Card>

          <PrimaryButton
            title="Directions"
            variant="outline"
            onPress={openDirections}
            style={styles.arrivingButton}
          />
          <PrimaryButton
            title="Start Pickup"
            onPress={handleStartPickup}
            style={styles.arrivingButton}
          />
        </ScrollView>
      )}

      {/* Step: Scanning */}
      {step === 'scanning' && (
        <View style={styles.scanPage}>
          {/* Counter */}
          <View style={styles.counterBar}>
            <View style={styles.counterLeft}>
              {expectedCount != null ? (
                <>
                  <Text style={styles.counterLabel}>Expected</Text>
                  <Text style={styles.counterNum}>{expectedCount}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.counterLabel}>Scanning</Text>
                  <Text style={styles.counterNum}>—</Text>
                </>
              )}
            </View>
            <View style={styles.counterDivider} />
            <View style={styles.counterRight}>
              <Text style={styles.counterLabel}>Scanned</Text>
              <Text
                style={[
                  styles.counterNum,
                  allScanned && styles.counterNumDone,
                ]}
              >
                {scannedCount}
                {expectedCount != null ? ` / ${expectedCount}` : ''}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          {expectedCount != null && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressRatio * 100}%` as any },
                  allScanned && styles.progressFillDone,
                ]}
              />
            </View>
          )}

          {/* Camera */}
          {permission?.granted ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
                onBarcodeScanned={
                  scanBusy ? undefined : ({ data }) => handleScanCode(data)
                }
              />
              <View style={styles.cameraOverlay}>
                <View style={[styles.scanFrame, { width: scanFrameSize, height: scanFrameSize }]} />
              </View>
            </View>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <MaterialCommunityIcons name="camera-off" size={40} color={colors.disabled} />
              <Text style={styles.cameraPlaceholderText}>Camera access required</Text>
              <PrimaryButton title="Enable Camera" onPress={requestPermission as any} style={{ marginTop: 12 }} />
            </View>
          )}

          {/* Last scan feedback */}
          {lastScanned && (
            <View style={styles.lastScannedRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.lastScannedText} numberOfLines={1}>
                Scanned: {lastScanned}
              </Text>
            </View>
          )}

          {/* Manual entry */}
          <View style={styles.manualSection}>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter code manually"
                placeholderTextColor={colors.disabled}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={() => manualCode.trim() && handleScanCode(manualCode)}
              />
              <Pressable
                onPress={() => manualCode.trim() && handleScanCode(manualCode)}
                disabled={!manualCode.trim() || scanBusy}
                style={[
                  styles.manualSubmit,
                  (!manualCode.trim() || scanBusy) && styles.manualSubmitDisabled,
                ]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Pressable
              onPress={handleDone}
              disabled={completing || (expectedCount != null && !allScanned)}
              style={[
                styles.doneButton,
                (expectedCount != null && !allScanned) && styles.doneButtonDisabled,
                allScanned && styles.doneButtonReady,
              ]}
            >
              {completing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={allScanned ? 'check-bold' : 'package-check'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.doneButtonText}>
                    {expectedCount != null && !allScanned
                      ? `${expectedCount - scannedCount} remaining`
                      : 'DONE — Complete Pickup'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Step: Completed */}
      {step === 'completing' && (
        <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
          <View style={styles.doneCard}>
            <MaterialCommunityIcons name="check-decagram" size={64} color={colors.success} />
            <Text style={styles.doneTitle}>Pickup Complete</Text>
            <Text style={styles.doneSub}>
              {pickup.pharmacyName} — packages marked as picked up.
            </Text>
            {scannedCount > 0 && (
              <View style={styles.doneStats}>
                <Text style={styles.doneStatValue}>{scannedCount}</Text>
                <Text style={styles.doneStatLabel}>packages scanned</Text>
              </View>
            )}
          </View>

          <Card style={styles.scannedListCard}>
            <Text style={styles.scannedListTitle}>Scanned Packages ({scannedCount})</Text>
            {scannedCodes.length === 0 ? (
              <Text style={styles.noScansText}>No codes recorded in this session.</Text>
            ) : (
              scannedCodes.map((code, i) => (
                <View key={code} style={styles.scannedItem}>
                  <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.primaryDark} />
                  <Text style={styles.scannedCode}>{code}</Text>
                </View>
              ))
            )}
          </Card>

          <PrimaryButton
            title="Back to Pickups"
            onPress={() => router.replace('/pickups')}
            style={styles.arrivingButton}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryDark,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerText: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  headerSub: { color: '#A9E4E9', fontSize: 12, fontWeight: '700', marginTop: 2 },

  stepContent: { padding: 18, paddingBottom: 40 },

  infoCard: { marginBottom: 16 },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoValue: { color: colors.navy, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  infoAddr: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  expectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  expectedText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  expectedNum: { fontWeight: '900', fontSize: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  timeText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  notesBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notesLabel: { color: '#92400E', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { color: '#78350F', fontSize: 14, lineHeight: 20 },
  arrivingButton: { marginBottom: 12 },

  // Scanning step
  scanPage: { flex: 1, backgroundColor: '#04181C' },
  counterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  counterLeft: { flex: 1, alignItems: 'center' },
  counterRight: { flex: 1, alignItems: 'center' },
  counterDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  counterLabel: {
    color: '#A9E4E9',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  counterNum: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 2 },
  counterNumDone: { color: '#4ADE80' },

  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 0,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressFillDone: { backgroundColor: '#4ADE80' },

  cameraWrap: { flex: 1, position: 'relative' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,17,21,0.3)',
  },
  scanFrame: {
    borderWidth: 3,
    borderColor: '#C6FBFF',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },

  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D2229',
    gap: 8,
  },
  cameraPlaceholderText: { color: colors.muted, fontSize: 14, fontWeight: '700' },

  lastScannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lastScannedText: { color: '#4ADE80', fontSize: 13, fontWeight: '700', flex: 1 },

  manualSection: {
    backgroundColor: '#0D2229',
    padding: 14,
    gap: 10,
  },
  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  manualInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  manualSubmit: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitDisabled: { opacity: 0.4 },

  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: colors.muted,
  },
  doneButtonDisabled: { opacity: 0.5 },
  doneButtonReady: { backgroundColor: colors.success },
  doneButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },

  // Done step
  doneCard: {
    alignItems: 'center',
    paddingVertical: 36,
    marginBottom: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 24,
  },
  doneTitle: { fontSize: 26, fontWeight: '900', color: colors.success, marginTop: 12 },
  doneSub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  doneStats: { marginTop: 20, alignItems: 'center' },
  doneStatValue: { fontSize: 48, fontWeight: '900', color: colors.success },
  doneStatLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 4 },

  scannedListCard: { marginBottom: 16 },
  scannedListTitle: { fontSize: 16, fontWeight: '900', color: colors.navy, marginBottom: 12 },
  noScansText: { color: colors.muted, fontSize: 14 },
  scannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scannedCode: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
});
