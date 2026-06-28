import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import type { Delivery } from '@/types/api';

function openDirections(pickup: Delivery) {
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

export default function PickupsScreen() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      let all: any[] = [];

      try {
        const routeResult = await rxexApi.myRoute();
        const raw = routeResult as any;
        const candidates = raw.deliveries ?? raw.stops ?? raw.route?.deliveries ?? raw.route?.stops ?? [];
        all = (Array.isArray(candidates) ? candidates : []).map((s: any) => ({ ...s, id: s.id ?? s.orderId }));
        console.log('[Pickups] my-route items:', all.length);
      } catch {
        console.log('[Pickups] my-route failed, falling back');
      }

      if (all.length === 0) {
        const fallback = await rxexApi.deliveries();
        all = fallback.deliveries ?? [];
        console.log('[Pickups] fallback items:', all.length);
      }

      const pickups = all.filter((d: any) => d.deliveryType === 'pickup');
      console.log('[Pickups] pickup items:', pickups.length, 'of', all.length);
      setItems(pickups);
    } catch (error: any) {
      console.log('[Pickups] error:', error?.message);
      // Don't alert on server errors — just show empty state
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setBusy(true);
      load();
    }, [load])
  );

  const activeCount = useMemo(
    () => items.filter(d => !['picked_up', 'in_transit', 'cancelled'].includes(d.status)).length,
    [items]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <FlatList
        data={items}
        keyExtractor={(item, index) => String((item as any).id ?? (item as any).orderId ?? index)}
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Pickups</Text>
              {activeCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.pageSubtitle}>
              {activeCount > 0
                ? `${activeCount} pharmacy pickup${activeCount !== 1 ? 's' : ''} assigned`
                : 'No pharmacy pickups assigned'}
            </Text>
            {items.length > 0 && (
              <Text style={styles.sectionLabel}>PHARMACY PICKUPS</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <MaterialCommunityIcons name="store-outline" size={48} color={colors.disabled} />
              <Text style={styles.emptyTitle}>No pickups assigned</Text>
              <Text style={styles.emptySubtitle}>
                Pharmacy pickup stops will appear here once dispatch assigns them.
              </Text>
              <PrimaryButton title="Refresh" onPress={load} style={styles.emptyButton} />
            </Card>
          )
        }
        renderItem={({ item, index }) => (
          <PickupCard
            pickup={item}
            pickupNumber={index + 1}
            onDirections={() => openDirections(item)}
            onPress={() => router.push(`/pickup/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

function PickupCard({
  pickup,
  pickupNumber,
  onDirections,
  onPress,
}: {
  pickup: Delivery;
  pickupNumber: number;
  onDirections: () => void;
  onPress: () => void;
}) {
  const isDone = ['picked_up', 'in_transit', 'cancelled'].includes(pickup.status);
  const expectedCount = pickup.expectedPackageCount ?? null;

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.card, isDone && styles.cardDone]}>
        <View style={styles.cardHeader}>
          <View style={styles.pickupNumberBadge}>
            <Text style={styles.pickupNumberText}>PICKUP {pickupNumber}</Text>
          </View>
          <StatusBadge status={pickup.status} />
        </View>

        <Text style={styles.pharmacyName}>{pickup.pharmacyName}</Text>
        <Text style={styles.addressLine}>
          {pickup.street}{pickup.aptUnit ? `, ${pickup.aptUnit}` : ''}
        </Text>
        <Text style={styles.addressLine}>
          {pickup.city}, {pickup.state} {pickup.postalCode}
        </Text>

        {expectedCount != null && (
          <View style={styles.packageCountRow}>
            <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.primaryDark} />
            <Text style={styles.packageCountText}>
              Expected Packages: <Text style={styles.packageCountNum}>{expectedCount}</Text>
            </Text>
          </View>
        )}

        {pickup.timeWindow ? (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
            <Text style={styles.timeText}>{pickup.timeWindow}</Text>
          </View>
        ) : null}

        {!isDone && (
          <View style={styles.actionRow}>
            <Pressable onPress={onDirections} style={styles.directionsButton}>
              <MaterialCommunityIcons name="navigation" size={18} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>Directions</Text>
            </Pressable>
            <Pressable onPress={onPress} style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Pickup</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primaryDark} />
            </Pressable>
          </View>
        )}

        {isDone && (
          <View style={styles.doneRow}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
            <Text style={styles.doneText}>Pickup completed</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 32, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 4,
    backgroundColor: colors.primaryDark,
  },
  pageTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  countBadge: {
    backgroundColor: colors.online,
    borderRadius: 999,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  pageSubtitle: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 4,
    color: '#A9E4E9',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: colors.primaryDark,
  },
  sectionLabel: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDone: { opacity: 0.65 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickupNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickupNumberText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pharmacyName: { fontSize: 18, fontWeight: '900', color: colors.navy, marginBottom: 4 },
  addressLine: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  packageCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  packageCountText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  packageCountNum: { fontWeight: '900', fontSize: 16 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  timeText: { color: colors.muted, fontSize: 13, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 13,
  },
  directionsButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  startButtonText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },

  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  doneText: { color: colors.success, fontWeight: '700', fontSize: 14 },

  emptyCard: { margin: 18, alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 20, width: 160 },
});
