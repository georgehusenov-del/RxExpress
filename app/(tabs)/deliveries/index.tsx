import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import { startGpsLoop, stopGpsLoop } from '@/utils/location';
import type { Delivery } from '@/types/api';

function fallbackGigNumber(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `RX-GIG-${y}${m}${d}-001`;
}

function openMaps(delivery: Delivery) {
  const addr = [delivery.street, delivery.aptUnit, delivery.city, delivery.state, delivery.postalCode]
    .filter(Boolean).join(', ');
  if (delivery.latitude && delivery.longitude) {
    const coord = `${delivery.latitude},${delivery.longitude}`;
    const url = Platform.select({ ios: `maps://app?daddr=${coord}`, android: `geo:${coord}?q=${coord}` });
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

export default function DeliveriesScreen() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [gigNumber, setGigNumber] = useState<string>(fallbackGigNumber());
  const [busy, setBusy] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const load = useCallback(async () => {
    try {
      let deliveries: Delivery[] = [];
      let gigFromApi: string | undefined;
      let routeSource = '';

      try {
        const routeResult = await rxexApi.myRoute();
        const raw = routeResult as any;
        const candidates: any[] = raw.deliveries ?? raw.stops ?? raw.route?.deliveries ?? raw.route?.stops ?? [];
        deliveries = (Array.isArray(candidates) ? candidates : []).map((s: any) => ({
          ...s,
          id: s.id ?? s.orderId,
        }));
        gigFromApi = raw.gigNumber ?? raw.gig_number ?? raw.route?.gigNumber ?? raw.routePlanId?.toString();
        routeSource = `my-route → ${deliveries.length} items`;
      } catch (routeErr: any) {
        routeSource = `my-route FAILED: ${routeErr?.message}`;
      }

      if (deliveries.length === 0) {
        try {
          const fallback = await rxexApi.deliveries();
          const raw = fallback as any;
          deliveries = (raw.deliveries ?? raw.stops ?? raw.orders ?? []).map((s: any) => ({
            ...s,
            id: s.id ?? s.orderId,
          }));
          routeSource += ` | /deliveries fallback → ${deliveries.length} items`;
        } catch (fallbackErr: any) {
          routeSource += ` | /deliveries FAILED: ${fallbackErr?.message}`;
        }
      }

      setDebugInfo(routeSource);
      setItems(deliveries);
      if (gigFromApi) setGigNumber(gigFromApi);
    } catch (error: any) {
      setDebugInfo(`Load error: ${error?.message}`);
      Alert.alert('Unable to load deliveries', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setBusy(true); load(); }, [load]));

  useEffect(() => {
    if (profile?.status === 'on_duty') { startGpsLoop().catch(() => null); }
    else { stopGpsLoop().catch(() => null); }
    return () => { stopGpsLoop().catch(() => null); };
  }, [profile?.status]);


  // Per API checklist: assigned, picked_up, dispatched, out_for_delivery, delivering_now
  const deliveryStops = useMemo(() => {
    const ACTIVE = new Set(['new', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivering_now']);
    const stops = items.filter(item => ACTIVE.has(item.status));
    return [...stops].sort((a, b) => {
      const aSeq = (a as any).optimizedSequence ?? a.stopNumber ?? 999;
      const bSeq = (b as any).optimizedSequence ?? b.stopNumber ?? 999;
      return aSeq - bSeq;
    });
  }, [items]);

  const isOnline = ['on_duty', 'available', 'online'].includes(profile?.status ?? '');
  const remainingCount = deliveryStops.filter(d => !['delivered', 'completed', 'failed', 'cancelled'].includes(d.status)).length;

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }
  if (!user) return <Redirect href="/login" />;

  async function toggleOnline(value: boolean) {
    try {
      setStatusBusy(true);
      const next = value ? 'on_duty' : 'offline';
      await rxexApi.setStatus(next);
      await refreshProfile();
      if (value) await startGpsLoop(); else await stopGpsLoop();
    } catch (error: any) {
      Alert.alert('Status update failed', error?.message || 'Unable to update driver status.');
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleNavigate(delivery: Delivery) {
    setNavigatingId(delivery.id);
    // Per API docs: navigate only logs an event, does NOT change order status
    rxexApi.driverAction(delivery.id, { action: 'navigate' }).catch(() => null);
    openMaps(delivery);
    setNavigatingId(null);
  }

  return (
    <View style={styles.page}>
      <FlatList
        data={deliveryStops}
        keyExtractor={(item, index) => String((item as any).id ?? (item as any).orderId ?? index)}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Gig header */}
            <View style={styles.gigHeader}>
              <View style={styles.gigLeft}>
                <Text style={styles.gigLabel}>Gig #</Text>
                <Text style={styles.gigNumber}>{gigNumber}</Text>
              </View>
              <View style={styles.gigRight}>
                <Text style={[styles.onlineLabel, { color: isOnline ? colors.online : colors.offline }]}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
                <Switch
                  value={isOnline}
                  onValueChange={toggleOnline}
                  disabled={statusBusy}
                  trackColor={{ false: colors.offline, true: colors.online }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.offline}
                />
              </View>
            </View>

            {/* Route summary */}
            <View style={styles.routeSummary}>
              <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.primaryDark} />
              <Text style={styles.routeSummaryText}>
                {remainingCount > 0
                  ? `${remainingCount} stop${remainingCount !== 1 ? 's' : ''} remaining`
                  : deliveryStops.length > 0
                  ? 'All stops complete'
                  : 'No stops assigned yet'}
              </Text>
            </View>

            {/* Debug banner */}
            {debugInfo ? (
              <Pressable onPress={() => setDebugInfo('')}>
                <View style={styles.debugBanner}>
                  <Text style={styles.debugText}>🔍 {debugInfo}</Text>
                  <Text style={styles.debugDismiss}>tap to dismiss</Text>
                </View>
              </Pressable>
            ) : null}

            {deliveryStops.length > 0 && <Text style={styles.sectionLabel}>DELIVERY STOPS</Text>}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <Card style={styles.emptyCard}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={48} color={colors.disabled} />
              <Text style={styles.emptyTitle}>No delivery stops assigned</Text>
              <Text style={styles.emptySubtitle}>Pull to refresh or check back after dispatch assigns your route.</Text>
              <PrimaryButton title="Refresh" onPress={load} style={styles.emptyButton} />
            </Card>
          )
        }
        renderItem={({ item, index }) => {
          const isPharmacyPickup = ['pickup', 'pharmacy_pickup'].includes((item.deliveryType ?? '').toLowerCase());
          const eta = (item as any).optimizedDurationText as string | undefined;
          return (
            <StopCard
              stop={item}
              stopNumber={(item as any).optimizedSequence ?? (item as any).stopNumber ?? index + 1}
              onNavigate={() => handleNavigate(item)}
              navigating={navigatingId === item.id}
              onViewDetail={() => router.push(isPharmacyPickup ? `/pickup/${item.id}` : `/delivery/${item.id}`)}
              isPharmacyPickup={isPharmacyPickup}
              eta={eta}
            />
          );
        }}
        ListFooterComponent={
          <Pressable onPress={logout} style={styles.signOutRow}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.muted} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        }
      />
    </View>
  );
}

// ─── Stop Card ────────────────────────────────────────────────────────────────

function StopCard({
  stop, stopNumber, onNavigate, navigating, onViewDetail, isPharmacyPickup, eta,
}: {
  stop: Delivery;
  stopNumber: number;
  onNavigate: () => void;
  navigating: boolean;
  onViewDetail: () => void;
  isPharmacyPickup?: boolean;
  eta?: string;
}) {
  const isDone = ['delivered', 'completed', 'failed', 'cancelled'].includes(stop.status);
  const isActive = stop.status === 'delivering_now';
  const isCold = stop.isRefrigerated;
  const pkgCode = (stop as any).qrCode ?? stop.orderNumber;
  const hasCopay = stop.copayAmount > 0;

  return (
    <View style={[
      styles.stopCard,
      isCold && styles.stopCardCold,
      isActive && styles.stopCardActive,
      isDone && styles.stopCardDone,
    ]}>
      {/* Cold chain banner */}
      {isCold && (
        <View style={styles.coldBanner}>
          <MaterialCommunityIcons name="snowflake" size={15} color="#075985" />
          <Text style={styles.coldBannerText}>❄  REFRIGERATED — Cold Chain Required</Text>
        </View>
      )}

      {/* Stop header */}
      <View style={styles.stopHeader}>
        <View style={[styles.stopNumberBadge, isActive && styles.stopNumberBadgeActive, isCold && styles.stopNumberBadgeCold]}>
          <Text style={[styles.stopNumberText, isActive && styles.stopNumberTextActive, isCold && styles.stopNumberTextCold]}>
            STOP {stopNumber}
          </Text>
        </View>
        <StatusBadge status={stop.status} />
      </View>

      {/* Name */}
      <Text style={styles.stopPatient}>{isPharmacyPickup ? stop.pharmacyName : stop.recipientName}</Text>
      <Text style={styles.stopAddress}>{stop.street}{stop.aptUnit ? `, ${stop.aptUnit}` : ''}</Text>
      <Text style={styles.stopAddress}>{stop.city}, {stop.state} {stop.postalCode}</Text>

      {/* Package code — clean text only */}
      {pkgCode ? (
        <View style={styles.pkgCodeRow}>
          <Text style={styles.pkgCodeLabel}>Package Code</Text>
          <Text style={styles.pkgCode}>{pkgCode}</Text>
        </View>
      ) : null}

      {/* Time + ETA + Copay row */}
      <View style={styles.metaRow}>
        {stop.timeWindow ? (
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.metaPillText}>{stop.timeWindow}</Text>
          </View>
        ) : null}
        {eta ? (
          <View style={styles.etaPill}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color="#065F46" />
            <Text style={styles.etaText}>ETA {eta}</Text>
          </View>
        ) : null}
        {hasCopay && (
          <View style={[styles.metaPill, stop.copayCollected ? styles.metaPillDone : styles.metaPillCopay]}>
            <MaterialCommunityIcons
              name="cash"
              size={14}
              color={stop.copayCollected ? colors.success : '#92400E'}
            />
            <Text style={[styles.metaPillText, stop.copayCollected ? styles.metaPillTextDone : styles.metaPillTextCopay]}>
              {stop.copayCollected ? 'Copay paid' : `Collect $${Number(stop.copayAmount).toFixed(2)}`}
            </Text>
          </View>
        )}
      </View>

      {/* Action row */}
      {!isDone && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={onNavigate}
            disabled={navigating}
            style={[styles.navigateButton, isActive && styles.navigateButtonActive, isCold && !isActive && styles.navigateButtonCold]}
          >
            {navigating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="navigation" size={18} color="#FFFFFF" />
                <Text style={styles.navigateButtonText}>Navigate</Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={onViewDetail} style={styles.detailButton}>
            <Text style={styles.detailButtonText}>{isPharmacyPickup ? 'Scan' : 'Details'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primaryDark} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingTop: 0, paddingBottom: 32, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  gigHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18, paddingTop: 56, paddingBottom: 16,
  },
  gigLeft: { flex: 1 },
  gigLabel: { color: '#A9E4E9', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  gigNumber: { marginTop: 2, color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  gigRight: { alignItems: 'flex-end', gap: 6 },
  onlineLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },

  routeSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgSoft, paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  routeSummaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14, flex: 1 },

  sectionLabel: {
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8,
    color: colors.muted, fontSize: 11, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  debugBanner: { margin: 10, padding: 10, borderRadius: 10, backgroundColor: '#1e293b' },
  debugText: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  debugDismiss: { color: '#475569', fontSize: 10, marginTop: 4 },

  // Stop card
  stopCard: {
    marginHorizontal: 14, marginBottom: 16,
    backgroundColor: colors.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOpacity: 1,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden',
  },
  stopCardCold: { borderColor: '#93C5FD', backgroundColor: '#F0F9FF' },
  stopCardActive: { borderColor: '#C2410C', borderWidth: 2, backgroundColor: '#FFF7ED' },
  stopCardDone: { opacity: 0.55 },

  coldBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  coldBannerText: { color: '#075985', fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },

  stopHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  stopNumberBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border,
  },
  stopNumberBadgeActive: { backgroundColor: '#FED7AA', borderColor: '#C2410C' },
  stopNumberBadgeCold: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  stopNumberText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  stopNumberTextActive: { color: '#C2410C' },
  stopNumberTextCold: { color: '#075985' },

  stopPatient: { fontSize: 19, fontWeight: '900', color: colors.navy, paddingHorizontal: 16, marginBottom: 4 },
  stopAddress: { fontSize: 13, color: colors.muted, lineHeight: 19, paddingHorizontal: 16 },

  // Package code
  pkgCodeRow: { paddingHorizontal: 16, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgCodeLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pkgCode: { color: colors.primaryDark, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  // Meta row
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12,
    backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border,
  },
  metaPillDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  metaPillCopay: { backgroundColor: '#FEF9C3', borderColor: '#FCD34D' },
  metaPillText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  metaPillTextDone: { color: colors.success },
  metaPillTextCopay: { color: '#92400E', fontWeight: '800' },
  etaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7',
  },
  etaText: { color: '#065F46', fontSize: 13, fontWeight: '800' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 12 },
  navigateButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 14,
  },
  navigateButtonActive: { backgroundColor: '#C2410C' },
  navigateButtonCold: { backgroundColor: '#0369A1' },
  navigateButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  detailButton: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  detailButtonText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },

  emptyCard: { margin: 18, alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 20, width: 160 },

  signOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  signOutText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
