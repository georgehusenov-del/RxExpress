import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLogo } from '@/components/AppLogo';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import type { Delivery } from '@/types/api';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

export default function HistoryScreen() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all');

  const load = useCallback(async () => {
    try {
      const result = await rxexApi.history();
      setItems(result.deliveries);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setBusy(true);
    load();
  }, [load]));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(item => item.status === filter), [filter, items]);
  const completedCount = useMemo(() => items.filter(item => ['delivered', 'completed'].includes(item.status)).length, [items]);

  if (loading) return <Screen contentContainerStyle={styles.center}><ActivityIndicator color={colors.primary} /></Screen>;
  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroEyebrow}>Closed stops</Text>
                  <Text style={styles.heroTitle}>Delivery history</Text>
                  <Text style={styles.heroSubtitle}>Track completed, failed, and cancelled deliveries with proof indicators.</Text>
                </View>
                <AppLogo size="small" />
              </View>
              <View style={styles.heroFooter}>
                <Text style={styles.heroStatValue}>{completedCount}</Text>
                <Text style={styles.heroStatLabel}>Completed records</Text>
              </View>
            </View>

            <SectionTitle title="Filter history" subtitle="Switch between all deliveries and specific closed outcomes." />
            <View style={styles.filters}>
              {filters.map(item => (
                <Pressable key={item.key} onPress={() => setFilter(item.key)}>
                  <Text style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          busy ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
            <Card style={styles.emptyCard}>
              <AppLogo size="medium" />
              <Text style={styles.emptyTitle}>No delivery history yet</Text>
              <Text style={styles.emptySubtitle}>Completed or closed stops will appear here after your first route run.</Text>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.order}>{item.orderNumber}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.line}>{item.recipientName}</Text>
            <Text style={styles.lineMuted}>{item.street}{item.aptUnit ? `, ${item.aptUnit}` : ''}</Text>
            <Text style={styles.lineMuted}>{item.city}, {item.state} {item.postalCode}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.lineSmall}>Delivered: {item.actualDeliveryTime || item.updatedAt || '-'}</Text>
              <View style={styles.indicators}>
                {item.photoUrl ? <MaterialCommunityIcons name="image-outline" size={18} color={colors.primaryDark} /> : null}
                {item.signatureUrl ? <MaterialCommunityIcons name="draw" size={18} color={colors.primaryDark} /> : null}
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  heroCard: { marginBottom: 22, backgroundColor: colors.primaryDark, borderRadius: 28, padding: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { color: '#A9E4E9', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { marginTop: 10, color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '900' },
  heroSubtitle: { marginTop: 10, color: '#D8F3F7', fontSize: 14, lineHeight: 21 },
  heroFooter: { marginTop: 20 },
  heroStatValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  heroStatLabel: { marginTop: 4, color: '#D8F3F7', fontSize: 13, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', color: colors.primaryDark, fontWeight: '700' },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark, color: '#FFFFFF' },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  order: { flex: 1, fontSize: 19, fontWeight: '900', color: colors.primaryDark },
  line: { marginTop: 10, color: colors.navy, fontWeight: '800', fontSize: 15 },
  lineMuted: { marginTop: 4, color: colors.muted, fontSize: 14, lineHeight: 20 },
  lineSmall: { marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  indicators: { flexDirection: 'row', gap: 8, marginTop: 12 },
  emptyCard: { marginTop: 20, alignItems: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 20, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});