import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import { getCurrentCoordinates } from '@/utils/location';
import type { Delivery } from '@/types/api';

export default function PickedUpScreen() {
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();
  const scanFrameSize = Math.round(width * 0.78);
  const [items, setItems] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);
  const [scanningItem, setScanningItem] = useState<Delivery | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const load = useCallback(async () => {
    try {
      let all: any[] = [];
      try {
        const routeResult = await rxexApi.myRoute();
        const raw = routeResult as any;
        const candidates = raw.deliveries ?? raw.stops ?? raw.route?.deliveries ?? raw.route?.stops ?? [];
        all = (Array.isArray(candidates) ? candidates : []).map((s: any) => ({ ...s, id: s.id ?? s.orderId }));
      } catch {
        const fallback = await rxexApi.deliveries();
        all = (fallback as any).deliveries ?? [];
      }
      setItems(all.filter((d: any) => d.status === 'picked_up'));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to load picked up items.');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setBusy(true); load(); }, [load]));

  async function handleOfficeScan(rawCode: string, item: Delivery) {
    if (scanLockRef.current || scanBusy) return;
    const code = rawCode.trim();
    if (!code) return;
    scanLockRef.current = true;
    setScanBusy(true);
    try {
      const coords = await getCurrentCoordinates().catch(() => undefined);
      const result = await rxexApi.scanCode(item.id, {
        scanType: 'office_scan',
        scannedCode: code,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Vibration.vibrate(80);
      setScanningItem(null);
      setManualCode('');
      Alert.alert('Office Scan Complete', result.message || 'Package is now in transit.');
      await load();
    } catch (e: any) {
      const msg: string = e.message || '';
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('does not belong') || msgLower.includes('not belong to this order') || msgLower.includes('wrong order')) {
        Alert.alert('Wrong QR Code', 'This package does not belong to this order or scan step.');
      } else if (msgLower.includes('outside') || msgLower.includes('geofence') || msgLower.includes('radius')) {
        Alert.alert('Outside Office Area', 'You must be inside the office location to complete this scan.');
      } else if (msgLower.includes('already scanned') || msgLower.includes('already verified') || msgLower.includes('in transit')) {
        Alert.alert('Already Verified', 'Package already verified. No duplicate event created.');
        await load();
      } else {
        Alert.alert('Scan failed', msg || 'Could not verify this QR code. Try again.');
      }
    } finally {
      setScanBusy(false);
      setTimeout(() => { scanLockRef.current = false; }, 800);
    }
  }

  function openScanner(item: Delivery) {
    if (!permission?.granted) {
      requestPermission().then(r => { if (r.granted) setScanningItem(item); });
    } else {
      setScanningItem(item);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      {/* Office scan modal */}
      <Modal visible={!!scanningItem} animationType="slide" onRequestClose={() => setScanningItem(null)}>
        <View style={styles.scanModal}>
          <View style={styles.scanModalHeader}>
            <Pressable onPress={() => { setScanningItem(null); setManualCode(''); }} style={styles.scanModalBack}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.scanModalHeaderText}>
              <Text style={styles.scanModalTitle}>Office Scan</Text>
              <Text style={styles.scanModalSub} numberOfLines={1}>
                {scanningItem?.pharmacyName || scanningItem?.orderNumber}
              </Text>
            </View>
            <StatusBadge status={scanningItem?.status ?? ''} />
          </View>

          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
                  onBarcodeScanned={scanBusy || !scanningItem ? undefined : ({ data }) => handleOfficeScan(data, scanningItem)}
                />
                <View style={styles.cameraOverlay}>
                  <View style={[styles.scanFrame, { width: scanFrameSize, height: scanFrameSize }]} />
                </View>
                {scanBusy && (
                  <View style={styles.scanBusyOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <MaterialCommunityIcons name="camera-off" size={40} color={colors.disabled} />
                <Text style={styles.cameraPlaceholderText}>Camera access required</Text>
                <PrimaryButton title="Enable Camera" onPress={requestPermission as any} style={{ marginTop: 12 }} />
              </View>
            )}
          </View>

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
                onSubmitEditing={() => scanningItem && manualCode.trim() && handleOfficeScan(manualCode, scanningItem)}
              />
              <Pressable
                onPress={() => scanningItem && manualCode.trim() && handleOfficeScan(manualCode, scanningItem)}
                disabled={!manualCode.trim() || scanBusy || !scanningItem}
                style={[styles.manualSubmit, (!manualCode.trim() || scanBusy) && styles.manualSubmitDisabled]}
              >
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={styles.scanModalHint}>Scan the office QR to mark package as In Transit</Text>
          </View>
        </View>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(item, i) => String((item as any).id ?? i)}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Picked Up</Text>
              {items.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.pageSubtitle}>
              {items.length > 0
                ? `${items.length} item${items.length !== 1 ? 's' : ''} picked up — office scan or delivery required`
                : 'No items picked up yet'}
            </Text>
            {items.length > 0 && <Text style={styles.sectionLabel}>PICKED UP ITEMS</Text>}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <Card style={styles.emptyCard}>
              <MaterialCommunityIcons name="package-check" size={48} color={colors.disabled} />
              <Text style={styles.emptyTitle}>No items picked up</Text>
              <Text style={styles.emptySubtitle}>
                Items you have picked up from pharmacy will appear here until delivered or sent to office.
              </Text>
              <PrimaryButton title="Refresh" onPress={load} style={styles.emptyButton} />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <PickedUpCard
            item={item}
            onOfficeScan={() => openScanner(item)}
            onDeliver={() => router.push(`/delivery/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

function PickedUpCard({
  item,
  onOfficeScan,
  onDeliver,
}: {
  item: Delivery;
  onOfficeScan: () => void;
  onDeliver: () => void;
}) {
  const isPharmacyPickup = ['pickup', 'pharmacy_pickup'].includes((item.deliveryType ?? '').toLowerCase());
  const displayName = isPharmacyPickup ? item.pharmacyName : item.recipientName;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <MaterialCommunityIcons
            name={isPharmacyPickup ? 'store-outline' : 'truck-delivery-outline'}
            size={14}
            color={colors.primaryDark}
          />
          <Text style={styles.typeBadgeText}>{isPharmacyPickup ? 'PHARMACY' : 'DELIVERY'}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.addr}>{item.street}{item.aptUnit ? `, ${item.aptUnit}` : ''}</Text>
      <Text style={styles.addr}>{item.city}, {item.state} {item.postalCode}</Text>

      {item.orderNumber ? (
        <View style={styles.orderRow}>
          <MaterialCommunityIcons name="barcode" size={14} color={colors.muted} />
          <Text style={styles.orderNum}>{item.orderNumber}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable onPress={onOfficeScan} style={styles.officeBtn}>
          <MaterialCommunityIcons name="office-building-outline" size={18} color="#FFFFFF" />
          <Text style={styles.officeBtnText}>Scan at Office</Text>
        </Pressable>
        {!isPharmacyPickup && (
          <Pressable onPress={onDeliver} style={styles.deliverBtn}>
            <Text style={styles.deliverBtnText}>Deliver</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primaryDark} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 32, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 56, paddingBottom: 4,
    backgroundColor: colors.primaryDark,
  },
  pageTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  countBadge: {
    backgroundColor: colors.online, borderRadius: 999,
    minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  pageSubtitle: {
    paddingHorizontal: 18, paddingBottom: 16, paddingTop: 4,
    color: '#A9E4E9', fontSize: 13, fontWeight: '700',
    backgroundColor: colors.primaryDark,
  },
  sectionLabel: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8,
    color: colors.muted, fontSize: 11, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: colors.card, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border,
  },
  typeBadgeText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 18, fontWeight: '900', color: colors.navy, marginBottom: 4 },
  addr: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  orderNum: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  officeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 13,
  },
  officeBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  deliverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  deliverBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },

  // Office scan modal
  scanModal: { flex: 1, backgroundColor: '#04181C' },
  scanModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 16,
  },
  scanModalBack: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scanModalHeaderText: { flex: 1 },
  scanModalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  scanModalSub: { color: '#A9E4E9', fontSize: 12, fontWeight: '700', marginTop: 2 },
  cameraWrap: { flex: 1, position: 'relative' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(2,17,21,0.3)' },
  scanFrame: { borderWidth: 3, borderColor: '#C6FBFF', borderRadius: 24, backgroundColor: 'transparent' },
  scanBusyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0D2229' },
  cameraPlaceholderText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  manualSection: { backgroundColor: '#0D2229', padding: 16, gap: 10 },
  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  manualInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 14, fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  manualSubmit: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  manualSubmitDisabled: { opacity: 0.4 },
  scanModalHint: { color: '#A9E4E9', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  emptyCard: { margin: 18, alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 20, width: 160 },
});
