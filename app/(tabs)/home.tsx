import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLogo } from '@/components/AppLogo';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusBadge } from '@/components/StatusBadge';
import { rxexApi } from '@/api/rxexApi';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { startGpsLoop, stopGpsLoop } from '@/utils/location';
import type { Delivery } from '@/types/api';

export default function HomeScreen() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [activeResult, historyResult] = await Promise.all([rxexApi.deliveries(), rxexApi.history()]);
      setDeliveries(activeResult.deliveries);
      setHistory(historyResult.deliveries);
    } catch (error: any) {
      Alert.alert('Dashboard unavailable', error?.message || 'Unable to load dashboard data.');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setBusy(true);
    load();
  }, [load]));

  useEffect(() => {
    if (profile?.status === 'on_duty') {
      startGpsLoop().catch(() => null);
    } else {
      stopGpsLoop().catch(() => null);
    }

    return () => {
      stopGpsLoop().catch(() => null);
    };
  }, [profile?.status]);

  const stats = useMemo(() => {
    const completedCount = history.filter(item => ['delivered', 'completed'].includes(item.status)).length;
    const refrigeratedCount = deliveries.filter(item => item.isRefrigerated).length;
    const copayCount = deliveries.filter(item => item.copayAmount > 0 && !item.copayCollected).length;

    return [
      { label: 'Stops remaining', value: deliveries.length, icon: 'map-marker-path' as const },
      { label: 'Completed', value: completedCount, icon: 'check-decagram-outline' as const },
      { label: 'Cold-chain', value: refrigeratedCount, icon: 'snowflake' as const },
      { label: 'Copays due', value: copayCount, icon: 'cash-multiple' as const },
    ];
  }, [deliveries, history]);

  if (loading) {
    return <Screen contentContainerStyle={styles.center}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  if (!user) return <Redirect href="/login" />;

  async function handleStatusChange(nextStatus: 'on_duty' | 'offline' | 'on_break') {
    try {
      setStatusBusy(true);
      await rxexApi.setStatus(nextStatus);
      await refreshProfile();
      if (nextStatus === 'on_duty') {
        await startGpsLoop();
      } else {
        await stopGpsLoop();
      }
    } catch (error: any) {
      Alert.alert('Status update failed', error?.message || 'Unable to update driver status.');
    } finally {
      setStatusBusy(false);
    }
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>RxEx Driver</Text>
              <Text style={styles.heroTitle}>Welcome back, {displayName}.</Text>
              <Text style={styles.heroSubtitle}>Your delivery board, proof-of-delivery tools, and live route status are all here.</Text>
            </View>
            <AppLogo size="small" />
          </View>

          <View style={styles.profileRow}>
            <StatusBadge status={profile?.status || 'offline'} />
            {profile?.isVerified ? (
              <View style={styles.verifiedPill}>
                <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroMeta}>Vehicle: {profile?.vehicleType || '-'} {profile?.vehicleNumber ? `· ${profile.vehicleNumber}` : ''}</Text>
          <Text style={styles.heroMeta}>License: {profile?.licenseNumber || '-'}</Text>

          <View style={styles.statusRow}>
            <StatusButton label="On Duty" active={profile?.status === 'on_duty'} onPress={() => handleStatusChange('on_duty')} busy={statusBusy} />
            <StatusButton label="On Break" active={profile?.status === 'on_break'} onPress={() => handleStatusChange('on_break')} busy={statusBusy} />
            <StatusButton label="Offline" active={profile?.status === 'offline'} onPress={() => handleStatusChange('offline')} busy={statusBusy} />
          </View>
        </View>

        <SectionTitle title="Today at a glance" subtitle="Operational metrics from your active queue and completed stops." />
        <View style={styles.statsGrid}>
          {stats.map(item => (
            <Card key={item.label} style={styles.statCard}>
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primaryDark} />
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </Card>
          ))}
        </View>

        <SectionTitle title="Quick actions" subtitle="Jump straight into the work that matters most." />
        <View style={styles.actionsGrid}>
          <ActionTile icon="truck-delivery-outline" title="Open deliveries" subtitle="Review assigned stops" onPress={() => router.push('/deliveries')} />
          <ActionTile icon="qrcode-scan" title="Scan package" subtitle="Verify QR or tracking" onPress={() => router.push('/scan')} />
          <ActionTile icon="history" title="View history" subtitle="Check completed stops" onPress={() => router.push('/history')} />
        </View>

        <Card style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.alertTitle}>Live GPS tracking</Text>
          </View>
          <Text style={styles.alertBody}>
            {profile?.status === 'on_duty'
              ? 'Location updates are active while you are on duty.'
              : 'Switch to On Duty when you are ready to start sending live location updates.'}
          </Text>
        </Card>

        <PrimaryButton title="Sign Out" variant="outline" onPress={logout} style={styles.signOutButton} />
      </ScrollView>
    </Screen>
  );
}

function StatusButton({ label, active, onPress, busy }: { label: string; active: boolean; onPress: () => void; busy: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.statusButton, active && styles.statusButtonActive, busy && styles.statusButtonBusy]}>
      <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ActionTile({ icon, title, subtitle, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionTile}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.primaryDark} />
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 28,
    padding: 20,
    marginBottom: 22,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { color: '#A9E4E9', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { marginTop: 10, color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  heroSubtitle: { marginTop: 10, color: '#D8F3F7', fontSize: 14, lineHeight: 21 },
  profileRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F0FDF4' },
  verifiedText: { color: colors.success, fontWeight: '800', fontSize: 13 },
  heroMeta: { marginTop: 10, color: '#D8F3F7', fontSize: 14, fontWeight: '600' },
  statusRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  statusButtonActive: { backgroundColor: '#FFFFFF' },
  statusButtonBusy: { opacity: 0.6 },
  statusButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  statusButtonTextActive: { color: colors.primaryDark },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%', minHeight: 118 },
  statValue: { marginTop: 16, color: colors.navy, fontSize: 28, fontWeight: '900' },
  statLabel: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  actionsGrid: { gap: 12, marginBottom: 20 },
  actionTile: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  actionTitle: { marginTop: 12, color: colors.navy, fontSize: 18, fontWeight: '900' },
  actionSubtitle: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 20 },
  alertCard: { marginBottom: 18 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { color: colors.navy, fontSize: 16, fontWeight: '900' },
  alertBody: { marginTop: 10, color: colors.muted, fontSize: 14, lineHeight: 21 },
  signOutButton: { marginBottom: 12 },
});
