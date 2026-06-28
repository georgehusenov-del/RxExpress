import React, { useEffect } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { RxExpresssBrand, TrustStrip } from '@/components/RxExpresssBrand';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const { width, height } = useWindowDimensions();
  const compact = width < 380 || height < 720;

  useEffect(() => {
    if (!loading && user) {
      const id = setTimeout(() => router.replace('/home'), 180);
      return () => clearTimeout(id);
    }
  }, [loading, user]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#061B22" />
      <View style={styles.root}>
        <View style={[styles.poster, compact && styles.posterCompact]}>
          <View style={styles.blueWash} />
          <View style={styles.tealWash} />
          <View style={styles.routeArcOne} />
          <View style={styles.routeArcTwo} />
          <View style={[styles.routeDot, styles.routeDotOne]} />
          <View style={[styles.routeDot, styles.routeDotTwo]} />

          <View style={styles.mapPinGhost}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color="rgba(126,255,239,0.22)" />
          </View>
          <View style={styles.packageGhost}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color="rgba(126,255,239,0.2)" />
          </View>

          <View style={styles.brandCenter}>
            <RxExpresssBrand compact={compact} />
            <Text style={styles.tagline}>
              Prescription Delivery, <Text style={styles.taglineAccent}>Done Right.</Text>
            </Text>
          </View>

          <View style={styles.bottomBlock}>
            <TrustStrip />
            <Text style={styles.loadingText}>{loading || user ? 'Loading' : 'Ready'}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, !loading && styles.progressFillReady]} />
            </View>
            {!loading && !user ? (
              <Pressable
                style={({ pressed }) => [styles.signInButton, pressed && styles.signInButtonPressed]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.signInText}>Driver Sign In</Text>
                <MaterialCommunityIcons name="arrow-right" size={19} color="#062331" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#061B22' },
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#061B22',
  },
  poster: {
    width: '100%',
    maxWidth: 430,
    minHeight: 650,
    flex: 1,
    maxHeight: 760,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 30,
    backgroundColor: '#07335C',
    borderWidth: 1,
    borderColor: 'rgba(126,255,239,0.28)',
  },
  posterCompact: {
    minHeight: 580,
    paddingTop: 42,
    paddingBottom: 22,
    borderRadius: 28,
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
  routeArcOne: {
    position: 'absolute',
    left: 38,
    right: 46,
    bottom: 168,
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(126,255,239,0.28)',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 120,
    transform: [{ rotate: '-8deg' }],
  },
  routeArcTwo: {
    position: 'absolute',
    left: 66,
    right: 30,
    top: 120,
    height: 190,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 150,
    transform: [{ rotate: '14deg' }],
  },
  routeDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#39F3E2',
    shadowColor: '#39F3E2',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  routeDotOne: { left: 122, bottom: 218 },
  routeDotTwo: { right: 86, bottom: 292 },
  mapPinGhost: { position: 'absolute', left: 38, top: 198 },
  packageGhost: { position: 'absolute', right: 30, bottom: 118 },
  brandCenter: {
    alignItems: 'center',
    width: '100%',
  },
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
    width: '100%',
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
  progressFillReady: { width: '100%' },
  signInButton: {
    minHeight: 48,
    marginTop: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#86FFF1',
  },
  signInButtonPressed: { opacity: 0.82 },
  signInText: { color: '#062331', fontSize: 15, fontWeight: '900' },
});
