import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import type { Delivery } from '@/types/api';

type DateFilter = 'today' | 'week' | 'month';
type TypeFilter = 'all' | 'delivered' | 'failed' | 'cancelled';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function isWithinDateFilter(item: Delivery, filter: DateFilter): boolean {
  const dateStr = item.actualDeliveryTime ?? item.updatedAt ?? item.createdAt;
  if (!dateStr) return filter === 'today' ? false : true;
  const date = new Date(dateStr);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    return date >= startOfDay;
  }
  if (filter === 'week') {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - dayOfWeek);
    return date >= startOfWeek;
  }
  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return date >= startOfMonth;
}

function formatTimestamp(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const load = useCallback(async () => {
    try {
      const result = await rxexApi.history();
      setItems(result.deliveries);
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

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesDate = isWithinDateFilter(item, dateFilter);
      const matchesType =
        typeFilter === 'all'
          ? true
          : typeFilter === 'delivered'
          ? ['delivered', 'completed'].includes(item.status)
          : item.status === typeFilter;
      return matchesDate && matchesType;
    });
  }, [items, dateFilter, typeFilter]);

  const stats = useMemo(() => {
    const base = items.filter(d => isWithinDateFilter(d, dateFilter));
    return {
      delivered: base.filter(d => ['delivered', 'completed'].includes(d.status)).length,
      failed: base.filter(d => d.status === 'failed').length,
      cancelled: base.filter(d => d.status === 'cancelled').length,
    };
  }, [items, dateFilter]);

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
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Page header */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>History</Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill
                value={stats.delivered}
                label="Delivered"
                color={colors.success}
                icon="check-circle-outline"
              />
              <StatPill
                value={stats.failed}
                label="Failed"
                color={colors.danger}
                icon="close-circle-outline"
              />
              <StatPill
                value={stats.cancelled}
                label="Cancelled"
                color="#991B1B"
                icon="cancel"
              />
            </View>

            {/* Date filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Period</Text>
              <View style={styles.filterRow}>
                {DATE_FILTERS.map(f => (
                  <Pressable
                    key={f.key}
                    onPress={() => setDateFilter(f.key)}
                    style={[styles.filterChip, dateFilter === f.key && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, dateFilter === f.key && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Type filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Status</Text>
              <View style={styles.filterRow}>
                {TYPE_FILTERS.map(f => (
                  <Pressable
                    key={f.key}
                    onPress={() => setTypeFilter(f.key)}
                    style={[styles.filterChip, typeFilter === f.key && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, typeFilter === f.key && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {filtered.length > 0 && (
              <Text style={styles.resultCount}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </Text>
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
              <MaterialCommunityIcons name="history" size={48} color={colors.disabled} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptySubtitle}>
                {typeFilter !== 'all'
                  ? `No ${typeFilter} stops for this period.`
                  : 'Completed stops will appear here.'}
              </Text>
              {typeFilter !== 'all' && (
                <PrimaryButton
                  title="Show All"
                  variant="outline"
                  onPress={() => setTypeFilter('all')}
                  style={styles.emptyButton}
                />
              )}
            </Card>
          )
        }
        renderItem={({ item }) => <HistoryCard item={item} />}
      />
    </View>
  );
}

function HistoryCard({ item }: { item: Delivery }) {
  const isPickup = item.deliveryType === 'pickup';
  const timestamp = formatTimestamp(item.actualDeliveryTime ?? item.updatedAt);

  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <MaterialCommunityIcons
            name={isPickup ? 'store-outline' : 'truck-delivery-outline'}
            size={16}
            color={colors.muted}
            style={styles.typeIcon}
          />
          <Text style={styles.orderNum}>{item.orderNumber}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {isPickup ? (
        <Text style={styles.nameLine}>{item.pharmacyName}</Text>
      ) : (
        <Text style={styles.nameLine}>{item.recipientName}</Text>
      )}

      <Text style={styles.addrLine}>
        {item.street}{item.aptUnit ? `, ${item.aptUnit}` : ''}
      </Text>
      <Text style={styles.addrLine}>
        {item.city}, {item.state} {item.postalCode}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.timestampRow}>
          <MaterialCommunityIcons name="clock-check-outline" size={14} color={colors.muted} />
          <Text style={styles.timestampText}>{timestamp}</Text>
        </View>
        <View style={styles.proofRow}>
          {item.photoUrl ? (
            <MaterialCommunityIcons name="image-outline" size={18} color={colors.primaryDark} />
          ) : null}
          {item.signatureUrl ? (
            <MaterialCommunityIcons name="draw" size={18} color={colors.primaryDark} />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function StatPill({
  value,
  label,
  color,
  icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 32, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  pageHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 16,
  },
  pageTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.bgSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },

  filterSection: { paddingHorizontal: 14, paddingTop: 14 },
  filterSectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterChipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: '#FFFFFF' },

  resultCount: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: { marginHorizontal: 14, marginBottom: 12 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  cardTopLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeIcon: {},
  orderNum: { flex: 1, fontSize: 17, fontWeight: '900', color: colors.primaryDark },
  nameLine: { fontSize: 15, fontWeight: '800', color: colors.navy, marginBottom: 2 },
  addrLine: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timestampText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  proofRow: { flexDirection: 'row', gap: 8 },

  emptyCard: { margin: 18, alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 16, width: 140 },
});
