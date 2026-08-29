import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { SignatureModal } from '@/components/SignatureModal';
import { rxexApi } from '@/api/rxexApi';
import type { Delivery, DeliveryPackage } from '@/types/api';
import { colors } from '@/theme/colors';
import { captureBase64Photo } from '@/utils/image';
import { getCurrentCoordinates } from '@/utils/location';
import { openNavigationForDelivery, sanitizePhone } from '@/utils/navigation';
import { getContentMaxWidth, getHorizontalPadding } from '@/utils/responsive';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

type CopayDecision = 'collected' | 'not_collected' | null;

export default function DeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const deliveryId = Number(id);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [podBusy, setPodBusy] = useState(false);
  const [attemptBusy, setAttemptBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [failureReason, setFailureReason] = useState('recipient_not_home');
  const [signature, setSignature] = useState<string | undefined>();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [photoHome, setPhotoHome] = useState<string | undefined>();
  const [photoAddr, setPhotoAddr] = useState<string | undefined>();
  const [photoPkg, setPhotoPkg] = useState<string | undefined>();
  const [copayDecision, setCopayDecision] = useState<CopayDecision>(null);
  const [packages, setPackages] = useState<DeliveryPackage[]>([]);
  const [allScanned, setAllScanned] = useState(true);
  const [etaLabel, setEtaLabel] = useState<string | null>(null);
  const [showPackageScanner, setShowPackageScanner] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [manualScanCode, setManualScanCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const localScannedRef = useRef<Set<string>>(new Set());
  const podRunning = useRef(false);
  const attemptRunning = useRef(false);
  const lastPodStart = useRef(0);
  const lastAttemptStart = useRef(0);
  const horizontalPadding = getHorizontalPadding(width);
  const contentMaxWidth = getContentMaxWidth(width, 920);

  async function load() {
    try {
      // Primary: dedicated detail endpoint
      try {
        const r = await rxexApi.deliveryDetail(deliveryId);
        const order = { ...r.order, id: r.order.id ?? deliveryId };
        setDelivery(order);
        const pkgs = r.packages ?? [];
        setPackages(pkgs);
        if (pkgs.length === 0) setAllScanned(true);
        else setAllScanned(pkgs.every(p => p.status === 'scanned'));
        // Use backend ETA from route if available on the order object
        const eta = (order as any).optimizedDurationText as string | undefined;
        if (eta) setEtaLabel(eta);
        return;
      } catch {}
      // Fallback: my-route
      let found: Delivery | undefined;
      try {
        const r = await rxexApi.myRoute();
        const raw = r as any;
        const stops: any[] = (raw.stops ?? raw.deliveries ?? []).map((s: any) => ({
          ...s,
          id: s.id ?? s.orderId,
        }));
        found = stops.find((d: any) => d.id === deliveryId);
        if (found) {
          const eta = (found as any).optimizedDurationText as string | undefined;
          if (eta) setEtaLabel(eta);
        }
      } catch {}
      if (!found) {
        const r = await rxexApi.deliveries();
        found = r.deliveries.find(d => d.id === deliveryId);
      }
      setDelivery(found || null);
      // Load packages separately on fallback path
      await loadPackages();
    } catch (e: any) {
      Alert.alert('Load failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPackages() {
    try {
      const result = await rxexApi.getPackages(deliveryId);
      const pkgs = result.packages ?? [];
      setPackages(pkgs);
      if (pkgs.length === 0) setAllScanned(true);
      else setAllScanned(pkgs.every(p => p.status === 'scanned'));
    } catch {
      // Don't touch allScanned or packages on failure — keep whatever is showing
    }
  }

  useEffect(() => { load(); }, [deliveryId]);

  const address = useMemo(() =>
    delivery
      ? `${delivery.street}${delivery.aptUnit ? ', ' + delivery.aptUnit : ''}, ${delivery.city}, ${delivery.state} ${delivery.postalCode}`
      : '',
    [delivery]
  );

  // Copay logic
  const copayRequired = !!(delivery && delivery.copayAmount > 0 && !delivery.copayCollected);
  const podUnlocked = !copayRequired || copayDecision === 'collected';

  async function capturePhoto(label: string, setter: (v: string) => void) {
    try {
      const data = await captureBase64Photo(label);
      setter(data);
    } catch (e: any) {
      Alert.alert('Photo failed', e.message);
    }
  }

  async function setStatus(status: string) {
    try {
      setPodBusy(true);
      await rxexApi.updateDeliveryStatus(deliveryId, status);
      await load();
    } catch (e: any) {
      const msg = String(e?.message || '');
      const needsPackageScan =
        msg.toLowerCase().includes('scan every package') ||
        msg.toLowerCase().includes('package label') ||
        msg.toLowerCase().includes('package part') ||
        msg.toLowerCase().includes('requirespackagepartscan') ||
        msg.toLowerCase().includes('scan the package');
      if (needsPackageScan) {
        setAllScanned(false);
        await loadPackages();
        Alert.alert(
          'Scan Package Labels',
          'This order requires scanning each package QR label individually. Tap "Open Scanner" below.',
          [
            { text: 'Open Scanner', onPress: () => setShowPackageScanner(true) },
            { text: 'Later', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Status failed', msg);
      }
    } finally {
      setPodBusy(false);
    }
  }

  async function handleCopayDecision(decision: 'collected' | 'not_collected') {
    setCopayDecision(decision);
    if (decision === 'collected') {
      try {
        await rxexApi.collectCopay(deliveryId);
        await load();
      } catch (e: any) {
        // Non-blocking: local state is still set.
        if (isDev) console.log('[Copay]', e.message);
      }
    }
  }

  async function handlePackageScan(rawCode: string) {
    if (scanLockRef.current || scanBusy) return;
    const code = rawCode.trim();
    if (!code) return;
    scanLockRef.current = true;
    setScanBusy(true);
    try {
      const coords = await getCurrentCoordinates().catch(() => undefined);
      const result = await rxexApi.scanCode(deliveryId, {
        scanType: 'delivering',
        scannedCode: code,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Vibration.vibrate(80);
      const scannedCode = result.scannedCode ?? code;
      setLastScanned(scannedCode);
      setManualScanCode('');

      // Show success flash briefly
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 1400);

      // Persist in ref — survives re-renders and cannot be overwritten by any API call
      localScannedRef.current.add(scannedCode);
      localScannedRef.current.add(code);
      if ((result as any).package?.packageCode) {
        localScannedRef.current.add((result as any).package.packageCode);
      }

      if (result.allScanned) {
        setAllScanned(true);
        setPackages(prev => prev.map(p => ({ ...p, status: 'scanned' })));
        // Auto-close after brief "all done" moment
        setTimeout(() => setShowPackageScanner(false), 1800);
      }
    } catch (e: any) {
      const msg: string = e.message || '';
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('do not scan the main order qr') || msgLower.includes('scan the package qr') || msgLower.includes('part label') || msgLower.includes('package-part')) {
        // Base QR used for multi-part order — ask for the physical part label
        Alert.alert('Wrong QR Code', 'Please scan the physical package-part label.');
      } else if (msgLower.includes('does not belong') || msgLower.includes('not belong to this order') || msgLower.includes('wrong order')) {
        // Package belongs to a different order or scan stage
        Alert.alert('Wrong QR Code', 'This package does not belong to this order or scan step.');
      } else if (msgLower.includes('already scanned') || msgLower.includes('already verified') || msgLower.includes('already been scanned')) {
        // Duplicate scan — keep part green, no alert, no duplicate event
        const scannedCode = (e as any)?.scannedCode ?? code;
        localScannedRef.current.add(scannedCode);
        localScannedRef.current.add(code);
        if ((e as any)?.package?.packageCode) localScannedRef.current.add((e as any).package.packageCode);
        setLastScanned(scannedCode);
        setManualScanCode('');
      } else {
        Alert.alert('Scan failed', msg || 'Could not verify this QR code. Try again.');
      }
    } finally {
      setScanBusy(false);
      setTimeout(() => { scanLockRef.current = false; }, 800);
    }
  }

  async function completeWithoutPodFallback() {
    for (const status of ['delivered', 'completed']) {
      try {
        await rxexApi.updateDeliveryStatus(deliveryId, status);
        Alert.alert('Completed', 'Delivery marked complete without POD upload.');
        router.replace('/deliveries');
        return;
      } catch {}
    }
    Alert.alert('Fallback failed', 'Unable to mark delivery complete.');
  }

  async function completePod() {
    const now = Date.now();
    if (podRunning.current || now - lastPodStart.current < 2500) return;
    if (!photoHome || !photoAddr || !photoPkg) {
      Alert.alert('Photos required', 'Please capture all 3 required photos before completing.');
      return;
    }
    if (delivery?.requiresSignature && !signature) {
      Alert.alert('Signature required', 'Please capture the recipient signature before completing.');
      return;
    }
    lastPodStart.current = now;
    podRunning.current = true;
    try {
      setPodBusy(true);
      const coords = await getCurrentCoordinates().catch(() => undefined);
      await rxexApi.submitPod(deliveryId, {
        photoHomeBase64: photoHome,
        photoAddressBase64: photoAddr,
        photoPackageBase64: photoPkg,
        signatureBase64: signature,
        recipientName: recipient || delivery?.recipientName,
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Alert.alert('Completed', 'Delivery completed with proof of delivery.');
      router.replace('/deliveries');
    } catch (e: any) {
      const message = e.message || 'POD upload failed.';
      const msgLower = String(message).toLowerCase();
      if (msgLower.includes('scan every package') || msgLower.includes('package/part qr') || msgLower.includes('requirespackagepartscan')) {
        setAllScanned(false);
        await loadPackages();
        Alert.alert(
          'Package Scan Required',
          'Scan every package/part QR at this stop before completing POD.',
          [{ text: 'Open Scanner', onPress: () => setShowPackageScanner(true) }, { text: 'Cancel', style: 'cancel' }]
        );
      } else if (msgLower.includes('failed to save photos')) {
        Alert.alert(
          'POD save failed',
          'Photo upload failed. Mark delivery complete without POD?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark Complete', onPress: () => completeWithoutPodFallback() },
          ]
        );
      } else {
        Alert.alert('POD failed', message);
      }
    } finally {
      podRunning.current = false;
      setPodBusy(false);
    }
  }

  async function failedAttempt() {
    const now = Date.now();
    if (attemptRunning.current || now - lastAttemptStart.current < 2500) return;
    lastAttemptStart.current = now;
    attemptRunning.current = true;
    try {
      setAttemptBusy(true);
      const coords = await getCurrentCoordinates().catch(() => undefined);
      const r = await rxexApi.driverAction(deliveryId, {
        action: 'failed',
        failureReason,
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Alert.alert('Attempt logged', r.message);
      router.replace('/deliveries');
    } catch (e: any) {
      Alert.alert('Failed attempt error', e.message);
    } finally {
      attemptRunning.current = false;
      setAttemptBusy(false);
    }
  }

  if (loading || !delivery) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading delivery...</Text>
      </Screen>
    );
  }

  const allPhotosCaptured = !!photoHome && !!photoAddr && !!photoPkg;
  // Merge backend package status with locally-scanned ref — ref wins (can never be overwritten)
  const effectivePackages = packages.map(p => ({
    ...p,
    status: (p.status === 'scanned' || localScannedRef.current.has(p.packageCode))
      ? 'scanned' as const
      : p.status,
  }));
  const effectiveAllScanned = packages.length === 0
    || effectivePackages.every(p => p.status === 'scanned')
    || allScanned;

  const canComplete = allPhotosCaptured && (!delivery.requiresSignature || !!signature) && podUnlocked && effectiveAllScanned;
  const phoneNumber = sanitizePhone(delivery.recipientPhone);

  async function callPatient() {
    if (!phoneNumber) return;
    // Log call action (fire-and-forget)
    rxexApi.driverAction(deliveryId, { action: 'call_patient' }).catch(() => null);
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert('Call failed', 'Unable to open the phone dialer on this device.');
    }
  }

  async function navigateToPatient() {
    if (!delivery) return;
    rxexApi.driverAction(deliveryId, { action: 'navigate' }).catch(() => null);
    // Auto-advance assigned/new → picked_up when driver taps Navigate
    if (['new', 'assigned'].includes(delivery.status)) {
      rxexApi.updateDeliveryStatus(deliveryId, 'picked_up')
        .then(() => load())
        .catch(() => null);
    }
    try {
      await openNavigationForDelivery(delivery);
    } catch {
      Alert.alert('Navigation failed', 'Unable to open maps for this delivery address.');
    }
  }

  async function sendEtaToPatient() {
    try {
      const result = await rxexApi.driverAction(deliveryId, { action: 'send_eta' });
      Alert.alert('ETA Sent', result.message || 'Patient has been notified via SMS.');
    } catch (e: any) {
      Alert.alert('Send ETA failed', e.message || 'Unable to send ETA SMS.');
    }
  }

  const scannedCountForModal = effectivePackages.filter(p =>
    p.status === 'scanned' || localScannedRef.current.has(p.packageCode)
  ).length;

  return (
    <>
      <SignatureModal
        visible={showSignatureModal}
        recipientName={recipient || delivery.recipientName}
        onSave={(sig) => {
          setSignature(sig);
          setShowSignatureModal(false);
        }}
        onCancel={() => setShowSignatureModal(false)}
      />

      {/* ── Full-screen Package QR Scanner Modal ── */}
      <Modal
        visible={showPackageScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowPackageScanner(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#04181C" />
        <View style={styles.scanModal}>
          {/* Camera fills the whole background */}
          {permission?.granted && (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
              onBarcodeScanned={scanBusy ? undefined : ({ data }) => handlePackageScan(data)}
            />
          )}

          {/* Translucent overlay */}
          <View style={styles.scanModalOverlay} pointerEvents="box-none">

            {/* Header */}
            <SafeAreaView style={styles.scanModalSafeTop}>
              <View style={styles.scanModalHeader}>
                <Pressable
                  onPress={() => setShowPackageScanner(false)}
                  style={styles.scanModalCloseBtn}
                  hitSlop={12}
                >
                  <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
                  <Text style={styles.scanModalCloseText}>Close</Text>
                </Pressable>

                <View style={styles.scanModalTitleWrap}>
                  <Text style={styles.scanModalTitle}>Scan Packages</Text>
                  <Text style={styles.scanModalSub}>Point camera at the package QR label</Text>
                </View>

                <View style={styles.scanModalProgressWrap}>
                  <Text style={[
                    styles.scanModalProgressNum,
                    effectiveAllScanned && styles.scanModalProgressNumDone,
                  ]}>
                    {scannedCountForModal}/{effectivePackages.length}
                  </Text>
                  <Text style={styles.scanModalProgressLabel}>verified</Text>
                </View>
              </View>
            </SafeAreaView>

            {/* Scan frame area */}
            <View style={styles.scanModalFrameArea} pointerEvents="none">
              <View style={styles.scanModalFrame}>
                {/* Corner markers */}
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />

                {/* Success flash */}
                {scanFlash && (
                  <View style={styles.scanSuccessFlash}>
                    <MaterialCommunityIcons name="check-circle" size={72} color="#FFFFFF" />
                    <Text style={styles.scanSuccessText}>Package verified</Text>
                  </View>
                )}

                {/* All done overlay */}
                {effectiveAllScanned && effectivePackages.length > 0 && !scanFlash && (
                  <View style={styles.scanAllDoneFlash}>
                    <MaterialCommunityIcons name="check-decagram" size={72} color="#4ADE80" />
                    <Text style={styles.scanAllDoneText}>All packages verified!</Text>
                  </View>
                )}

                {/* Busy overlay */}
                {scanBusy && (
                  <View style={styles.scanBusyOverlayModal}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                    <Text style={styles.scanBusyOverlayText}>Verifying…</Text>
                  </View>
                )}
              </View>
            </View>

            {/* No permission fallback */}
            {!permission?.granted && (
              <View style={styles.scanNoCameraWrap}>
                <MaterialCommunityIcons name="camera-off" size={52} color="rgba(255,255,255,0.5)" />
                <Text style={styles.scanNoCameraText}>Camera access required</Text>
                <Pressable onPress={requestPermission as any} style={styles.scanNoCameraBtn}>
                  <Text style={styles.scanNoCameraBtnText}>Enable Camera</Text>
                </Pressable>
              </View>
            )}

            {/* Bottom panel */}
            <SafeAreaView style={styles.scanModalBottomSafe}>
              <View style={styles.scanModalBottom}>

                {/* Status row */}
                <View style={styles.scanModalStatusRow}>
                  <View style={[
                    styles.scanModalStatusDot,
                    scanBusy && styles.scanModalStatusDotBusy,
                    !scanBusy && scanFlash && styles.scanModalStatusDotDone,
                    !scanBusy && effectiveAllScanned && styles.scanModalStatusDotDone,
                  ]} />
                  <Text style={[
                    styles.scanModalStatusText,
                    (scanFlash || effectiveAllScanned) && !scanBusy && styles.scanModalStatusTextDone,
                  ]}>
                    {scanBusy
                      ? 'Verifying…'
                      : effectiveAllScanned && effectivePackages.length > 0
                      ? 'Order scan complete'
                      : scanFlash && lastScanned
                      ? `Package verified: ${lastScanned}`
                      : 'Ready to scan'}
                  </Text>
                </View>

                {/* Package list */}
                {effectivePackages.length > 0 && (
                  <View style={styles.scanPkgList}>
                    {effectivePackages.map((pkg) => {
                      const verified = pkg.status === 'scanned' || localScannedRef.current.has(pkg.packageCode);
                      return (
                        <View key={pkg.id} style={styles.scanPkgItem}>
                          <MaterialCommunityIcons
                            name={verified ? 'check-circle' : 'circle-outline'}
                            size={18}
                            color={verified ? '#4ADE80' : 'rgba(255,255,255,0.45)'}
                          />
                          <Text style={[styles.scanPkgCode, verified && styles.scanPkgCodeDone]} numberOfLines={1}>
                            {pkg.packageCode}
                          </Text>
                          <Text style={[styles.scanPkgBadge, verified && styles.scanPkgBadgeDone]}>
                            {verified ? 'Verified' : 'Pending'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Manual entry */}
                <View style={styles.scanManualRow}>
                  <TextInput
                    style={styles.scanManualInput}
                    value={manualScanCode}
                    onChangeText={setManualScanCode}
                    placeholder="Enter code manually"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={() => manualScanCode.trim() && handlePackageScan(manualScanCode)}
                  />
                  <Pressable
                    onPress={() => manualScanCode.trim() && handlePackageScan(manualScanCode)}
                    disabled={!manualScanCode.trim() || scanBusy}
                    style={[styles.scanManualSubmit, (!manualScanCode.trim() || scanBusy) && styles.scanManualSubmitDisabled]}
                  >
                    <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
                  </Pressable>
                </View>

              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <Screen scroll keyboard contentContainerStyle={[styles.pad, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>

          {/* Header */}
          <View style={styles.backRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primaryDark} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <StatusBadge status={delivery.status} />
          </View>

          {/* Hero card */}
          <Card style={[styles.heroCard, delivery.isRefrigerated && styles.heroCardCold]}>
            {delivery.isRefrigerated && (
              <View style={styles.coldBannerFull}>
                <MaterialCommunityIcons name="snowflake" size={16} color="#075985" />
                <Text style={styles.coldBannerText}>REFRIGERATED - Cold Chain Required</Text>
              </View>
            )}
            <View style={styles.heroTop}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Current stop</Text>
                <Text style={styles.heroPatient}>{delivery.recipientName}</Text>
                <Text style={styles.heroAddress}>{address}</Text>
              </View>
              <View style={styles.heroRight}>
                <StatusBadge status={delivery.status} />
                {delivery.copayAmount > 0 && (
                  <View style={[styles.copayPill, delivery.copayCollected && styles.copayPillDone]}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={14}
                      color={delivery.copayCollected ? colors.success : '#92400E'}
                    />
                    <Text style={[styles.copayPillText, delivery.copayCollected && styles.copayPillTextDone]}>
                      ${Number(delivery.copayAmount).toFixed(2)} {delivery.copayCollected ? 'collected' : 'due'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.metaWrap}>
              <MetaPill icon="storefront-outline" text={delivery.pharmacyName} />
              <MetaPill icon="phone-outline" text={delivery.recipientPhone || 'No phone'} onPress={phoneNumber ? callPatient : undefined} />
              {delivery.timeWindow ? <MetaPill icon="clock-outline" text={delivery.timeWindow} /> : null}
              {etaLabel ? <MetaPill icon="map-marker-distance" text={`ETA ${etaLabel}`} /> : null}
            </View>
            <View style={styles.heroActions}>
              <Pressable style={styles.navigateButton} onPress={navigateToPatient}>
                <MaterialCommunityIcons name="navigation-variant" size={18} color="#FFFFFF" />
                <Text style={styles.navigateButtonText}>Navigate</Text>
              </Pressable>
              <Pressable style={styles.sendEtaButton} onPress={sendEtaToPatient}>
                <MaterialCommunityIcons name="message-text-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.sendEtaButtonText}>Send ETA to Patient</Text>
              </Pressable>
            </View>
          </Card>

          {/* Requirements */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Delivery requirements</Text>
            <RequirementRow label="Delivery type" value={delivery.deliveryType || 'Standard'} />
            <RequirementRow label="Signature" value={delivery.requiresSignature ? 'Required' : 'Not required'} />
            <RequirementRow label="Cold chain" value={delivery.isRefrigerated ? 'Cold-chain handling required' : 'Standard handling'} />
            {delivery.deliveryInstructions ? (
              <RequirementRow label="Instructions" value={delivery.deliveryInstructions} />
            ) : null}
          </Card>

          {/* Status workflow */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Workflow actions</Text>
            <Text style={styles.sectionSub}>Advance the stop through each stage in order.</Text>
            <View style={styles.buttons}>
              <StatusAction
                label="Mark Picked Up"
                icon="package-up"
                active={delivery.status === 'picked_up'}
                onPress={() => setStatus('picked_up')}
                busy={podBusy}
                done={['picked_up','in_transit','dispatched','out_for_delivery','delivering_now','delivered','completed'].includes(delivery.status)}
              />
              <StatusAction
                label="Out for Delivery"
                icon="truck-fast-outline"
                active={delivery.status === 'out_for_delivery'}
                onPress={() => setStatus('out_for_delivery')}
                busy={podBusy}
                done={['out_for_delivery','delivering_now','delivered','completed'].includes(delivery.status)}
              />
              <StatusAction
                label="Mark En Route"
                icon="map-marker-check-outline"
                active={delivery.status === 'delivering_now'}
                onPress={() => setStatus('delivering_now')}
                busy={podBusy}
                done={['delivering_now','delivered','completed'].includes(delivery.status)}
              />
            </View>
          </Card>

          {/* Copay gate */}
          {copayRequired && (
            <Card style={styles.mt}>
              <View style={styles.copayHeader}>
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#92400E" />
                <Text style={styles.copayTitle}>Copay Required</Text>
              </View>
              <Text style={styles.copayAmount}>Amount Due: ${Number(delivery.copayAmount).toFixed(2)}</Text>
              <Text style={styles.copaySub}>
                Select copay status before completing proof of delivery.
              </Text>

              <View style={styles.copayOptions}>
                <Pressable
                  style={[styles.copayOption, copayDecision === 'collected' && styles.copayOptionSelected]}
                  onPress={() => handleCopayDecision('collected')}
                >
                  <View style={[styles.radio, copayDecision === 'collected' && styles.radioSelected]}>
                    {copayDecision === 'collected' && <View style={styles.radioDot} />}
                  </View>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color={copayDecision === 'collected' ? colors.success : colors.muted} />
                  <Text style={[styles.copayOptionText, copayDecision === 'collected' && styles.copayOptionTextSelected]}>
                    Copay Collected
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.copayOption, copayDecision === 'not_collected' && styles.copayOptionWarning]}
                  onPress={() => setCopayDecision('not_collected')}
                >
                  <View style={[styles.radio, copayDecision === 'not_collected' && styles.radioWarning]}>
                    {copayDecision === 'not_collected' && <View style={styles.radioDotWarning} />}
                  </View>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color={copayDecision === 'not_collected' ? colors.danger : colors.muted} />
                  <Text style={[styles.copayOptionText, copayDecision === 'not_collected' && styles.copayOptionTextWarning]}>
                    Copay Not Collected
                  </Text>
                </Pressable>
              </View>

              {copayDecision === 'collected' && (
                <View style={styles.copayConfirmBanner}>
                  <MaterialCommunityIcons name="check-decagram" size={18} color={colors.success} />
                  <Text style={styles.copayConfirmText}>
                    Copay of ${Number(delivery.copayAmount).toFixed(2)} confirmed collected.
                  </Text>
                </View>
              )}

              {copayDecision === 'not_collected' && (
                <View style={styles.copayWarningBanner}>
                  <MaterialCommunityIcons name="alert" size={18} color={colors.danger} />
                  <Text style={styles.copayWarningText}>
                    Please collect the copay before completing the delivery.
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Package verification */}
          {effectivePackages.length > 0 && (
            <Card style={styles.mt}>
              <View style={styles.pkgHeader}>
                <MaterialCommunityIcons
                  name={effectiveAllScanned ? 'check-decagram' : 'package-variant-closed'}
                  size={22}
                  color={effectiveAllScanned ? colors.success : colors.primaryDark}
                />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Package Verification</Text>
                {effectiveAllScanned && (
                  <View style={styles.pkgAllDoneBadge}>
                    <Text style={styles.pkgAllDoneText}>All verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sectionSub}>
                Scan all package QR codes at this stop before completing delivery.
              </Text>

              {(() => {
                const scannedCount = effectivePackages.filter(p => p.status === 'scanned').length;
                const remaining = effectivePackages.length - scannedCount;
                return (
                  <View style={styles.pkgCountRow}>
                    <View style={styles.pkgCountBadge}>
                      <Text style={[styles.pkgCountNum, effectiveAllScanned && styles.pkgCountNumDone]}>
                        {scannedCount} / {effectivePackages.length}
                      </Text>
                      <Text style={styles.pkgCountLabel}> scanned</Text>
                    </View>
                    {!effectiveAllScanned && remaining > 0 && (
                      <View style={styles.pkgRemainingBadge}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
                        <Text style={styles.pkgRemainingText}>{remaining} remaining</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {effectivePackages.map((pkg, idx) => {
                const scanned = pkg.status === 'scanned';
                return (
                  <View
                    key={pkg.id}
                    style={[styles.pkgRow, scanned ? styles.pkgRowDone : styles.pkgRowPending]}
                  >
                    <MaterialCommunityIcons
                      name={scanned ? 'check-circle' : 'circle-outline'}
                      size={20}
                      color={scanned ? colors.success : colors.navy}
                    />
                    <View style={styles.pkgTextWrap}>
                      <Text style={[styles.pkgCode, scanned ? styles.pkgCodeDone : styles.pkgCodePending]}>
                        {pkg.packageCode}
                      </Text>
                      <Text style={[
                        styles.pkgIndexLabel,
                        scanned ? styles.pkgIndexLabelDone : styles.pkgIndexLabelPending,
                      ]}>
                        {idx + 1}/{effectivePackages.length}
                      </Text>
                    </View>
                    <View style={[styles.pkgStatusBadge, scanned ? styles.pkgStatusBadgeDone : styles.pkgStatusBadgePending]}>
                      <Text style={[styles.pkgStatus, scanned ? styles.pkgStatusDone : styles.pkgStatusPending]}>
                        {scanned ? 'Scanned' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {!effectiveAllScanned && (
                <Text style={styles.pkgHint}>
                  Scan all package QR codes before completing delivery.
                </Text>
              )}

              {lastScanned && (
                <View style={styles.lastScannedRow}>
                  <MaterialCommunityIcons name="check-circle" size={15} color={colors.success} />
                  <Text style={styles.lastScannedText}>Last scanned: {lastScanned}</Text>
                </View>
              )}

              {/* Open full-screen scanner */}
              {!effectiveAllScanned && (
                <Pressable
                  style={styles.scanPkgBtn}
                  onPress={() => {
                    if (!permission?.granted) {
                      requestPermission().then(r => { if (r.granted) setShowPackageScanner(true); });
                    } else {
                      setShowPackageScanner(true);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFFFFF" />
                  <Text style={styles.scanPkgBtnText}>Open QR Scanner</Text>
                </Pressable>
              )}
            </Card>
          )}

          {/* Proof of delivery */}
          {podUnlocked ? (
            <Card style={styles.mt}>
              <Text style={styles.sectionTitle}>Proof of Delivery</Text>
              <Text style={styles.sectionSub}>Capture all required evidence before completing the delivery.</Text>

              <InputField
                label="Recipient name"
                icon="account-outline"
                placeholder="Who accepted the delivery?"
                value={recipient}
                onChangeText={setRecipient}
                containerStyle={styles.fieldSpacing}
              />
              <InputField
                label="Delivery notes"
                icon="text-box-outline"
                placeholder="Optional delivery notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                containerStyle={styles.fieldSpacing}
                style={styles.notesInput}
              />

              <Text style={styles.fieldLabel}>Required photos</Text>
              <PhotoButton label="Home / building exterior" done={!!photoHome} onPress={() => capturePhoto('Home/building', setPhotoHome)} />
              <PhotoButton label="Address plaque / number" done={!!photoAddr} onPress={() => capturePhoto('Address', setPhotoAddr)} />
              <PhotoButton label="Package at door / handoff" done={!!photoPkg} onPress={() => capturePhoto('Package', setPhotoPkg)} />

              {delivery.requiresSignature && (
                <View style={styles.sigSection}>
                  <Text style={styles.fieldLabel}>Recipient signature</Text>
                  {signature ? (
                    <View style={styles.sigDone}>
                      <MaterialCommunityIcons name="check-decagram" size={24} color={colors.success} />
                      <View style={styles.sigDoneText}>
                        <Text style={styles.sigDoneTitle}>Signature saved</Text>
                        <Text style={styles.sigDoneSub}>Recipient has signed for this delivery.</Text>
                      </View>
                      <Pressable
                        onPress={() => { setSignature(undefined); setShowSignatureModal(true); }}
                        style={styles.sigRedoBtn}
                      >
                        <Text style={styles.sigRedoText}>Redo</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.sigCaptureBtn} onPress={() => setShowSignatureModal(true)}>
                      <MaterialCommunityIcons name="draw" size={24} color={colors.primaryDark} />
                      <View style={styles.sigCaptureBtnText}>
                        <Text style={styles.sigCaptureBtnTitle}>Capture Signature</Text>
                        <Text style={styles.sigCaptureBtnSub}>Opens full-screen signature pad</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              )}

              <PrimaryButton
                title={!effectiveAllScanned ? 'Scan Packages First' : 'Complete Delivery'}
                onPress={!effectiveAllScanned ? () => setShowPackageScanner(true) : completePod}
                loading={podBusy}
                disabled={(!canComplete && allScanned) || podBusy}
                style={styles.completeButton}
              />

              {!allPhotosCaptured && (
                <Text style={styles.warn}>Capture all 3 photos to enable completion.</Text>
              )}
              {allPhotosCaptured && delivery.requiresSignature && !signature && (
                <Text style={styles.warn}>Capture recipient signature to enable completion.</Text>
              )}
              {!effectiveAllScanned && effectivePackages.length > 0 && (
                <Text style={styles.warn}>Scan all package QR codes to enable completion.</Text>
              )}
            </Card>
          ) : copayDecision === 'not_collected' ? (
            <Card style={[styles.mt, styles.podLockedCard]}>
              <MaterialCommunityIcons name="lock" size={32} color={colors.danger} />
              <Text style={styles.podLockedTitle}>Proof of Delivery Locked</Text>
              <Text style={styles.podLockedSub}>
                Collect the ${Number(delivery.copayAmount).toFixed(2)} copay from the patient, then select "Copay Collected" above to unlock proof of delivery.
              </Text>
            </Card>
          ) : null}

          {/* Failed attempt */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Failed attempt</Text>
            <Text style={styles.sectionSub}>Use only when delivery could not be completed at this stop.</Text>
            <InputField
              label="Failure reason"
              icon="alert-circle-outline"
              placeholder="recipient_not_home"
              value={failureReason}
              onChangeText={setFailureReason}
              containerStyle={styles.fieldSpacing}
            />
            <PrimaryButton title="Log Failed Attempt" variant="danger" onPress={failedAttempt} loading={attemptBusy} />
          </Card>

        </View>
      </Screen>
    </>
  );
}

// Sub-components

function StatusAction({
  label, icon, active, done, onPress, busy,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  active: boolean;
  done: boolean;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || done}
      style={[styles.statusAction, active && styles.statusActionActive, done && styles.statusActionDone]}
    >
      <MaterialCommunityIcons
        name={done ? 'check-circle' : icon}
        size={20}
        color={done ? colors.success : active ? '#FFFFFF' : colors.primaryDark}
      />
      <Text style={[styles.statusActionText, active && styles.statusActionTextActive, done && styles.statusActionTextDone]}>
        {label}
      </Text>
      {done && (
        <MaterialCommunityIcons name="check" size={16} color={colors.success} />
      )}
    </Pressable>
  );
}

function PhotoButton({ label, done, onPress }: { label: string; done: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.photoBtn, done && styles.photoBtnDone]}>
      <MaterialCommunityIcons name={done ? 'check-decagram' : 'camera-outline'} size={22} color={done ? colors.success : colors.primaryDark} />
      <View style={styles.photoTextWrap}>
        <Text style={[styles.photoBtnLabel, done && styles.photoBtnLabelDone]}>{label}</Text>
        <Text style={styles.photoBtnHint}>{done ? 'Captured' : 'Tap to capture'}</Text>
      </View>
    </Pressable>
  );
}

function MetaPill({
  icon,
  text,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={15} color={onPress ? colors.primary : colors.primaryDark} />
      <Text style={[styles.metaText, onPress && styles.metaTextLink]}>{text}</Text>
      {onPress ? <MaterialCommunityIcons name="phone-forward-outline" size={14} color={colors.primary} /> : null}
    </>
  );

  return (
    onPress ? (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.metaPill, styles.metaPillLink, pressed && styles.metaPillPressed]}>
        {content}
      </Pressable>
    ) : (
      <View style={[styles.metaPill, styles.metaPillDisabled]}>
        {content}
      </View>
    )
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.requirementRow}>
      <Text style={styles.requirementLabel}>{label}</Text>
      <Text style={styles.requirementValue}>{value}</Text>
    </View>
  );
}

// Styles

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 60 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 15, fontWeight: '700' },
  mt: { marginTop: 12 },

  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },

  // Hero
  heroCard: { borderRadius: 20, overflow: 'hidden' },
  heroCardCold: { borderWidth: 2, borderColor: '#93C5FD', backgroundColor: '#F0F9FF' },
  coldBannerFull: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  coldBannerText: { color: '#075985', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16, paddingBottom: 8 },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroPatient: { marginTop: 6, fontSize: 24, fontWeight: '900', color: colors.navy },
  heroAddress: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 19 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  copayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FCD34D',
  },
  copayPillDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  copayPillText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
  copayPillTextDone: { color: colors.success },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bgSoft },
  metaPillLink: { borderWidth: 1, borderColor: 'rgba(0, 151, 167, 0.25)', backgroundColor: '#E8FAFC' },
  metaPillDisabled: { opacity: 0.95 },
  metaPillPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  metaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  metaTextLink: { color: colors.primary },
  heroActions: { paddingHorizontal: 16, paddingBottom: 16 },
  navigateButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
  },
  navigateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  sendEtaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.primaryDark, backgroundColor: '#FFFFFF',
  },
  sendEtaButtonText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.navy, marginBottom: 6 },
  sectionSub: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  requirementRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  requirementLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  requirementValue: { marginTop: 3, color: colors.text, fontSize: 14, fontWeight: '700' },

  // Status actions
  buttons: { gap: 8 },
  statusAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  statusActionActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  statusActionDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusActionText: { flex: 1, color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  statusActionTextActive: { color: '#FFFFFF' },
  statusActionTextDone: { color: colors.success },

  // Copay gate
  copayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  copayTitle: { fontSize: 17, fontWeight: '900', color: '#92400E' },
  copayAmount: { fontSize: 22, fontWeight: '900', color: colors.navy, marginBottom: 6 },
  copaySub: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  copayOptions: { gap: 10 },
  copayOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  copayOptionSelected: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
  copayOptionWarning: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.success },
  radioWarning: { borderColor: colors.danger },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  radioDotWarning: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  copayOptionText: { flex: 1, color: colors.muted, fontSize: 15, fontWeight: '700' },
  copayOptionTextSelected: { color: colors.success },
  copayOptionTextWarning: { color: colors.danger },
  copayConfirmBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  copayConfirmText: { flex: 1, color: '#15803D', fontSize: 13, fontWeight: '700' },
  copayWarningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  copayWarningText: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: '700' },

  // POD locked
  podLockedCard: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  podLockedTitle: { fontSize: 18, fontWeight: '900', color: colors.danger },
  podLockedSub: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // POD fields
  fieldSpacing: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.navy, marginBottom: 10, marginTop: 4 },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },

  // Photos
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  photoBtnDone: { borderColor: colors.success, backgroundColor: '#F0FFF4' },
  photoTextWrap: { flex: 1 },
  photoBtnLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  photoBtnLabelDone: { color: colors.success },
  photoBtnHint: { marginTop: 3, color: colors.muted, fontSize: 12 },

  // Signature
  sigSection: { marginTop: 4, marginBottom: 14 },
  sigCaptureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16,
    borderWidth: 2, borderColor: colors.primaryDark,
    borderStyle: 'dashed', backgroundColor: colors.bgSoft,
  },
  sigCaptureBtnText: { flex: 1 },
  sigCaptureBtnTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  sigCaptureBtnSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  sigDone: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  sigDoneText: { flex: 1 },
  sigDoneTitle: { color: '#15803D', fontSize: 15, fontWeight: '900' },
  sigDoneSub: { color: '#4ADE80', fontSize: 12, marginTop: 2 },
  sigRedoBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  sigRedoText: { color: colors.muted, fontSize: 13, fontWeight: '700' },

  completeButton: { marginTop: 14 },
  warn: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '600' },

  // Package verification
  pkgHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  pkgAllDoneBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  pkgAllDoneText: { color: colors.success, fontSize: 11, fontWeight: '900' },
  pkgCountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pkgCountBadge: { flexDirection: 'row', alignItems: 'center' },
  pkgCountLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  pkgCountNum: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  pkgCountNumDone: { color: colors.success },
  pkgRemainingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  pkgRemainingText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  pkgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#FFFFFF', marginBottom: 8,
  },
  pkgRowDone: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  pkgRowPending: { borderColor: colors.border, backgroundColor: '#FFFFFF' },
  pkgTextWrap: { flex: 1 },
  pkgCode: { fontSize: 14, fontWeight: '900', color: colors.navy, letterSpacing: 0.5 },
  pkgCodeDone: { color: colors.success },
  pkgCodePending: { color: colors.navy },
  pkgIndexLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  pkgIndexLabelDone: { color: colors.success },
  pkgIndexLabelPending: { color: colors.muted },
  pkgStatusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  pkgStatusBadgeDone: { backgroundColor: '#DCFCE7' },
  pkgStatusBadgePending: { backgroundColor: colors.bgSoft },
  pkgStatus: { fontSize: 11, fontWeight: '800' },
  pkgStatusDone: { color: colors.success },
  pkgStatusPending: { color: colors.text },
  pkgHint: { color: colors.danger, fontSize: 12, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  lastScannedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  lastScannedText: { color: colors.success, fontSize: 12, fontWeight: '700' },

  // Open-scanner button (in card)
  scanPkgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 16, marginTop: 6,
  },
  scanPkgBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // ── Full-screen QR Scanner Modal ──────────────────────────────────────────
  scanModal: { flex: 1, backgroundColor: '#04181C' },
  scanModalOverlay: { flex: 1, backgroundColor: 'rgba(2,17,21,0.35)' },

  scanModalSafeTop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  scanModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  scanModalCloseBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 76 },
  scanModalCloseText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  scanModalTitleWrap: { flex: 1, alignItems: 'center' },
  scanModalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  scanModalSub: { color: '#A9E4E9', fontSize: 12, fontWeight: '700', marginTop: 2 },
  scanModalProgressWrap: { width: 76, alignItems: 'flex-end' },
  scanModalProgressNum: { color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: '900' },
  scanModalProgressNumDone: { color: '#4ADE80' },
  scanModalProgressLabel: { color: '#A9E4E9', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Scan frame
  scanModalFrameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanModalFrame: {
    width: 280, height: 280,
    borderWidth: 3, borderColor: '#C6FBFF', borderRadius: 28,
    backgroundColor: 'transparent', position: 'relative',
    shadowColor: '#80F5FF', shadowOpacity: 0.45, shadowRadius: 22, elevation: 6,
  },
  scanCorner: { position: 'absolute', width: 28, height: 28 },
  scanCornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderTopLeftRadius: 8 },
  scanCornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderTopRightRadius: 8 },
  scanCornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderBottomRightRadius: 8 },

  // Overlays inside the frame
  scanSuccessFlash: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 28, backgroundColor: 'rgba(0,200,100,0.28)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  scanSuccessText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  scanAllDoneFlash: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 28, backgroundColor: 'rgba(74,222,128,0.22)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  scanAllDoneText: { color: '#4ADE80', fontSize: 16, fontWeight: '900' },
  scanBusyOverlayModal: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 28, backgroundColor: 'rgba(0,76,85,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  scanBusyOverlayText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // No camera
  scanNoCameraWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scanNoCameraText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' },
  scanNoCameraBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primary, marginTop: 4 },
  scanNoCameraBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  // Bottom panel
  scanModalBottomSafe: { backgroundColor: 'rgba(4,24,28,0.94)' },
  scanModalBottom: { padding: 16, gap: 12 },

  scanModalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanModalStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)' },
  scanModalStatusDotBusy: { backgroundColor: '#FCD34D' },
  scanModalStatusDotDone: { backgroundColor: '#4ADE80' },
  scanModalStatusText: { flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '700' },
  scanModalStatusTextDone: { color: '#4ADE80' },

  // Per-package list inside modal
  scanPkgList: { gap: 6 },
  scanPkgItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  scanPkgCode: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  scanPkgCodeDone: { color: '#FFFFFF' },
  scanPkgBadge: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800' },
  scanPkgBadgeDone: { color: '#4ADE80' },

  // Manual entry inside modal
  scanManualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanManualInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: '#FFFFFF', fontSize: 14, fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  scanManualSubmit: { width: 50, height: 50, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  scanManualSubmitDisabled: { opacity: 0.35 },
});
