import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RxExpresssBrand, TrustStrip } from '@/components/RxExpresssBrand';

export function BootSplash() {
  return (
    <View style={styles.screen}>
      <View style={styles.poster}>
        <View style={styles.blueWash} />
        <View style={styles.tealWash} />
        <View style={styles.routeArc} />
        <MaterialCommunityIcons name="package-variant-closed" size={62} color="rgba(126,255,239,0.18)" style={styles.packageIcon} />

        <RxExpresssBrand />
        <Text style={styles.tagline}>Prescription Delivery, <Text style={styles.taglineAccent}>Done Right.</Text></Text>

        <View style={styles.bottomBlock}>
          <TrustStrip />
          <Text style={styles.loadingText}>Loading</Text>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#061B22',
  },
  poster: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    maxHeight: 760,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#07335C',
    borderWidth: 1,
    borderColor: 'rgba(126,255,239,0.28)',
  },
  blueWash: {
    position: 'absolute',
    left: -70,
    top: -40,
    width: 360,
    height: 520,
    borderRadius: 180,
    backgroundColor: '#143DB9',
    opacity: 0.55,
  },
  tealWash: {
    position: 'absolute',
    right: -120,
    top: -80,
    width: 330,
    height: 420,
    borderRadius: 180,
    backgroundColor: '#1EF2D1',
    opacity: 0.5,
  },
  routeArc: {
    position: 'absolute',
    left: 46,
    right: 44,
    bottom: 170,
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(126,255,239,0.25)',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 120,
    transform: [{ rotate: '-8deg' }],
  },
  packageIcon: { position: 'absolute', right: 32, bottom: 120 },
  tagline: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  taglineAccent: { color: '#62FFEA' },
  bottomBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
  },
  progressTrack: {
    width: '48%',
    minWidth: 132,
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: 'rgba(126,255,239,0.25)',
  },
  progressFill: {
    width: '64%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#86FFF1',
  },
});
