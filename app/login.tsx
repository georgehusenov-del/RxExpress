import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { RxExpresssBrand } from '@/components/RxExpresssBrand';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const compact = width < 380;

  if (user) return <Redirect href="/home" />;

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your work email and password to continue.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      await login(email.trim(), password);
      router.replace('/home');
    } catch (loginError: any) {
      const message = loginError?.message || 'Unable to sign in right now.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#061B22" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrap, compact && styles.contentWrapCompact]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#BEEFEB" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            <View style={styles.heroWrap}>
              <View style={styles.brandCard}>
                <View style={styles.brandBlueWash} />
                <View style={styles.brandTealWash} />
                <RxExpresssBrand compact={compact} />
              </View>
              <Text style={styles.title}>Driver Sign In</Text>
              <Text style={styles.subtitle}>Secure access for authorized RxExpresss drivers</Text>
            </View>

            <Card style={styles.formCard}>
              <InputField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                label="Work email"
                icon="email-outline"
                placeholder="driver@rxexpresss.com"
                value={email}
                onChangeText={setEmail}
                containerStyle={styles.fieldSpacing}
              />
              <InputField
                autoCapitalize="none"
                autoCorrect={false}
                label="Password"
                icon="lock-outline"
                placeholder="Enter password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                containerStyle={styles.fieldSpacing}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <PrimaryButton title={loading ? 'Preparing...' : 'Sign In'} onPress={handleLogin} loading={busy} disabled={loading} />

              <View style={styles.securityNote}>
                <MaterialCommunityIcons name="shield-lock-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.securityNoteText}>
                  Protected driver access for prescription delivery operations.
                </Text>
              </View>

              <Pressable onPress={() => Alert.alert('Support', 'Contact dispatch or your administrator if you need a password reset.')}>
                <Text style={styles.supportText}>Need help signing in?</Text>
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#061B22' },
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    backgroundColor: '#061B22',
  },
  contentWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  contentWrapCompact: { maxWidth: 440 },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    marginBottom: 8,
  },
  backButtonText: { color: '#BEEFEB', fontSize: 14, fontWeight: '800' },
  heroWrap: { alignItems: 'center', marginBottom: 20 },
  brandCard: {
    width: '100%',
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(55, 225, 208, 0.24)',
    backgroundColor: '#07335C',
  },
  brandBlueWash: {
    position: 'absolute',
    left: -80,
    top: -50,
    width: 260,
    height: 280,
    borderRadius: 160,
    backgroundColor: '#143DB9',
    opacity: 0.55,
  },
  brandTealWash: {
    position: 'absolute',
    right: -90,
    top: -70,
    width: 250,
    height: 250,
    borderRadius: 150,
    backgroundColor: '#1EF2D1',
    opacity: 0.48,
  },
  title: { marginTop: 16, fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#BEEFEB', textAlign: 'center', fontWeight: '700' },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(55, 225, 208, 0.22)',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  fieldSpacing: { marginBottom: 14 },
  errorText: { marginBottom: 14, color: colors.danger, fontSize: 13, fontWeight: '700' },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.bgSoft,
  },
  securityNoteText: { flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  supportText: { marginTop: 16, textAlign: 'center', color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
});
