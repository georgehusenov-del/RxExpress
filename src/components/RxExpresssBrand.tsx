import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RxExpresssBrand({ compact = false, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <View style={styles.speedLineOne} />
        <View style={styles.speedLineTwo} />
        <View style={styles.pin}>
          <View style={styles.pinContent}>
            <MaterialCommunityIcons name="pill" size={compact ? 28 : 36} color="#FFFFFF" />
          </View>
          <View style={styles.crossBadge}>
            <MaterialCommunityIcons name="plus" size={compact ? 13 : 16} color="#062331" />
          </View>
        </View>
        <View style={styles.glowDot} />
      </View>

      <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>
        <Text style={styles.wordRx}>Rx</Text>
        <Text style={styles.wordExpress}>Expresss</Text>
      </Text>
    </View>
  );
}

export function TrustStrip() {
  return (
    <View style={styles.trustStrip}>
      <TrustItem icon="shield-check-outline" label="Trusted." />
      <View style={styles.divider} />
      <TrustItem icon="heart-pulse" label="Reliable." />
      <View style={styles.divider} />
      <TrustItem icon="lightning-bolt-outline" label="Fast." />
    </View>
  );
}

function TrustItem({ icon, label }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }) {
  return (
    <View style={styles.trustItem}>
      <MaterialCommunityIcons name={icon} size={13} color="#7FFFEF" />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  mark: {
    width: 122,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompact: { width: 94, height: 82 },
  speedLineOne: {
    position: 'absolute',
    left: 8,
    top: 42,
    width: 44,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#39F3E2',
  },
  speedLineTwo: {
    position: 'absolute',
    left: 20,
    top: 57,
    width: 30,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#39F3E2',
    opacity: 0.82,
  },
  pin: {
    width: 76,
    height: 76,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#39F3E2',
    borderWidth: 4,
    borderColor: '#C6FFF8',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#39F3E2',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  pinContent: {
    transform: [{ rotate: '-45deg' }],
  },
  crossBadge: {
    position: 'absolute',
    right: 6,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C6FFF8',
  },
  glowDot: {
    position: 'absolute',
    bottom: 7,
    width: 58,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(126, 255, 239, 0.55)',
  },
  wordmark: {
    marginTop: 5,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  wordmarkCompact: { fontSize: 32, lineHeight: 38 },
  wordRx: {
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  wordExpress: {
    color: '#36F0D8',
    fontStyle: 'italic',
  },
  trustStrip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  divider: { width: 1, height: 15, backgroundColor: 'rgba(255,255,255,0.38)' },
});
