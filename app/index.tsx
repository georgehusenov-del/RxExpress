import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppLogo } from '@/components/AppLogo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { brand } from '@/theme/brand';
import { colors } from '@/theme/colors';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.backdropA} />
      <View style={styles.backdropB} />
      <View style={styles.gridAura} />

      <View style={styles.heroShell}>
        <View style={styles.badgeRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Driver operations portal</Text>
          </View>
        </View>

        <AppLogo size="hero" glow style={styles.logoBlock} />

        <View style={styles.copyWrap}>
          <Text style={styles.title}>The calm, modern cockpit for every pharmacy run.</Text>
          <Text style={styles.subtitle}>Route visibility, proof of delivery, package scanning, and driver status in one cleaner workflow.</Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric value="Live" label="Queue" icon="truck-fast-outline" />
          <Metric value="3-step" label="POD" icon="camera-outline" />
          <Metric value="Secure" label="Driver" icon="shield-check-outline" />
        </View>

        <View style={styles.featurePanel}>
          <Feature label="Assigned stops with full detail" icon="clipboard-text-outline" />
          <Feature label="Fast QR verification at pickup" icon="qrcode-scan" />
          <Feature label="Signatures, notes, and photo proof" icon="draw-pen" />
        </View>
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.bottomTitle}>{loading ? 'Preparing your workspace' : brand.promise}</Text>
        <Text style={styles.bottomBody}>
          {loading
            ? 'Syncing your secure session, route access, and delivery tools.'
            : 'Designed for professional drivers who need speed, clarity, and reliable completion at the door.'}
        </Text>
        {loading ? (
          <View style={styles.loadingPanel}>
            <View style={styles.loadingSpinnerWrap}>
              <ActivityIndicator color={colors.white} size="small" />
            </View>
            <View style={styles.loadingCopyWrap}>
              <Text style={styles.loadingHeadline}>Loading driver portal</Text>
              <Text style={styles.loadingText}>Restoring secure session and dashboard access.</Text>
            </View>
          </View>
        ) : (
          <>
            <PrimaryButton
              title={user ? 'Open Dashboard' : 'Continue'}
              onPress={() => router.replace(user ? '/home' : '/login')}
            />
            {!user ? (
              <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.secondaryLink}>Driver sign in</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function Feature({ label, icon }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return (
    <View style={styles.featurePill}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function Metric({ value, label, icon }: { value: string; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primaryDark} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 28,
  },
  backdropA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 151, 167, 0.18)',
  },
  backdropB: {
    position: 'absolute',
    left: -50,
    bottom: 110,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 43, 58, 0.08)',
  },
  gridAura: {
    position: 'absolute',
    top: 160,
    left: 30,
    right: 30,
    height: 180,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroShell: {
    marginTop: 10,
  },
  badgeRow: {
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(0, 76, 85, 0.08)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  liveText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  logoBlock: {
    marginTop: 22,
    alignSelf: 'center',
  },
  copyWrap: {
    marginTop: 22,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.navy,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    textAlign: 'center',
  },
  metricsRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  metricCard: {
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0, 76, 85, 0.08)',
  },
  metricValue: {
    marginTop: 8,
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  featurePanel: {
    marginTop: 18,
    borderRadius: 28,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0, 76, 85, 0.08)',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  bottomCard: {
    marginTop: 18,
    padding: 22,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#002B3A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  bottomTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  bottomBody: {
    marginTop: 8,
    marginBottom: 18,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  loadingRow: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingPanel: {
    minHeight: 88,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  loadingSpinnerWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  loadingCopyWrap: { flex: 1 },
  loadingHeadline: { color: colors.white, fontSize: 16, fontWeight: '900' },
  loadingText: { marginTop: 4, color: '#D8F3F7', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  secondaryLink: {
    marginTop: 14,
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
});
