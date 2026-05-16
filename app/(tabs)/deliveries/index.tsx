import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLogo } from '@/components/AppLogo';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import type { Delivery } from '@/types/api';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'progress', label: 'In Progress' },
  { key: 'delivering', label: 'Delivering' },
] as const;

export default function DeliveriesScreen() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all');

  const load = useCallback(async () => {
    try {
      const result = await rxexApi.deliveries();
      setItems(result.deliveries);
    } catch (error) {
      console.log(error);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setBusy(true);
    load();
  }, [load]));

  const filteredItems = useMemo(() => {
    if (filter === 'assigned') return items.filter(item => item.status === 'assigned');
    if (filter === 'progress') return items.filter(item => ['picked_up', 'out_for_delivery'].includes(item.status));
    if (filter === 'delivering') return items.filter(item => item.status === 'delivering_now');
    return items;
  }, [filter, items]);

  const summary = useMemo(() => ({
    coldChain: items.filter(item => item.isRefrigerated).length,
    signature: items.filter(item => item.requiresSignature).length,
    copayDue: items.filter(item => item.copayAmount > 0 && !item.copayCollected).length,
  }), [items]);

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <FlatList
        data={filteredItems}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroEyebrow}>Active queue</Text>
                  <Text style={styles.heroTitle}>Assigned deliveries</Text>
                  <Text style={styles.heroSubtitle}>Review every active stop, priority note, and proof requirement before heading out.</Text>
                </View>
                <AppLogo size="small" />
              </View>

              <View style={styles.heroStats}>
                <HeroStat label="Total" value={items.length} />
                <HeroStat label="Cold-chain" value={summary.coldChain} />
                <HeroStat label="Signature" value={summary.signature} />
                <HeroStat label="Copay due" value={summary.copayDue} />
              </View>
            </View>

            <SectionTitle title="Filter your route" subtitle="Focus on assigned, in-progress, or delivering-now stops." />
            <View style={styles.filters}>
              {filters.map(item => (
                <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>
                  <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <Card style={styles.emptyCard}>
              <AppLogo size="medium" />
              <Text style={styles.emptyTitle}>No active deliveries right now</Text>
              <Text style={styles.emptySubtitle}>Pull to refresh or check back after dispatch assigns your next stop.</Text>
              <PrimaryButton title="Refresh" onPress={load} style={styles.emptyButton} />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/deliveries/${item.id}`)}>
            <Card style={styles.deliveryCard}>
              <View style={styles.cardTop}>
                <Text style={styles.order}>{item.orderNumber}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.pharmacy}>{item.pharmacyName}</Text>
              <Text style={styles.recipient}>{item.recipientName}</Text>
              <Text style={styles.address}>{item.street}{item.aptUnit ? `, ${item.aptUnit}` : ''}</Text>
              <Text style={styles.address}>{item.city}, {item.state} {item.postalCode}</Text>
              <View style={styles.metaRow}>
                <Meta icon="clock-outline" text={item.timeWindow} />
                <Meta icon="cash" text={`$${Number(item.copayAmount || 0).toFixed(2)}`} />
              </View>
              <View style={styles.cardFooter}>
                {item.isRefrigerated ? (
                  <View style={styles.refrigeratedBadge}>
                    <MaterialCommunityIcons name="snowflake" size={14} color={colors.primaryDark} />
                    <Text style={styles.refrigeratedText}>Refrigerated</Text>
                  </View>
                ) : <View />}
                <View style={styles.viewDetailsRow}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryDark} />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroStatCard}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
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
  heroStats: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heroStatCard: { minWidth: 74, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  heroStatLabel: { marginTop: 4, color: '#D8F3F7', fontSize: 12, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#FFFFFF' },
  deliveryCard: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  order: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '900', color: colors.primaryDark },
  pharmacy: { marginTop: 10, fontSize: 14, fontWeight: '800', color: colors.navy },
  recipient: { marginTop: 10, fontSize: 16, fontWeight: '800', color: colors.text },
  address: { marginTop: 4, color: colors.muted, fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F8FCFC', borderWidth: 1, borderColor: colors.border },
  metaText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  cardFooter: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  refrigeratedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: '#ECFEFF' },
  refrigeratedText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailsText: { color: colors.primaryDark, fontWeight: '800' },
  emptyCard: { marginTop: 20, alignItems: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 20, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 18 },
});