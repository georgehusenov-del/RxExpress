import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLogo } from '@/components/AppLogo';
import { brand } from '@/theme/brand';
import { colors } from '@/theme/colors';

export function BootSplash() {
  return (
    <View style={styles.screen}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <View style={styles.gridAura} />

      <View style={styles.centerWrap}>
        <View style={styles.badgePill}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Secure driver workspace</Text>
        </View>

        <AppLogo size="hero" glow style={styles.logoWrap} />

        <Text style={styles.title}>Loading your route command center</Text>
        <Text style={styles.subtitle}>{brand.promise}</Text>

        <View style={styles.metricsRow}>
          <Metric icon="shield-check-outline" label="Secure session" />
          <Metric icon="map-marker-path" label="Route sync" />
          <Metric icon="clipboard-check-outline" label="POD ready" />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.spinnerWrap}>
            <ActivityIndicator color={colors.white} />
          </View>
          <View style={styles.copyWrap}>
            <Text style={styles.statusTitle}>Preparing secure access</Text>
            <Text style={styles.statusBody}>Loading profile, live status, assigned deliveries, and driver tools.</Text>
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Professional delivery workflow</Text>
          <Text style={styles.footerBody}>Clean startup, secure session restore, and full delivery visibility before you move.</Text>
        </View>
      </View>
    </View>
  );
}

function Metric({ icon, label }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF8F9',
    justifyContent: 'center',
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  orbTop: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 290,
    height: 290,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 151, 167, 0.22)',
  },
  orbBottom: {
    position: 'absolute',
    left: -80,
    bottom: -20,
    width: 270,
    height: 270,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 43, 58, 0.1)',
  },
  gridAura: {
    position: 'absolute',
    top: 150,
    left: 18,
    right: 18,
    height: 210,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  centerWrap: {
    alignItems: 'center',
  },
  badgePill: {
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
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoWrap: { marginTop: 28 },
  title: {
    marginTop: 28,
    color: colors.navy,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  metricsRow: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  metricCard: {
    minWidth: 100,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0, 76, 85, 0.08)',
  },
  metricLabel: {
    marginTop: 8,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusCard: {
    marginTop: 28,
    width: '100%',
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.navy,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  spinnerWrap: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: { flex: 1 },
  statusTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  statusBody: { marginTop: 4, color: '#D8F3F7', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  footerCard: {
    marginTop: 18,
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(0, 76, 85, 0.08)',
  },
  footerTitle: { color: colors.navy, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  footerBody: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
