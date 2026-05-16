import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AppLogo } from '@/components/AppLogo';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { brand } from '@/theme/brand';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

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
    <Screen scroll keyboard contentContainerStyle={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <View style={styles.heroWrap}>
          <AppLogo size="large" glow />
          <Text style={styles.title}>Driver Sign In</Text>
          <Text style={styles.subtitle}>{brand.tagline}</Text>
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

          <PrimaryButton title="Sign In" onPress={handleLogin} loading={busy} />
          <Pressable onPress={() => Alert.alert('Support', 'Contact dispatch or your administrator if you need a password reset.')}>
            <Text style={styles.supportText}>Need help signing in?</Text>
          </Pressable>
        </Card>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Back to welcome</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center', paddingVertical: 28 },
  fill: { flex: 1, justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { alignItems: 'center', marginBottom: 22 },
  title: { marginTop: 22, fontSize: 32, lineHeight: 38, fontWeight: '900', color: colors.navy, textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  formCard: { borderRadius: 24 },
  fieldSpacing: { marginBottom: 14 },
  errorText: { marginBottom: 14, color: colors.danger, fontSize: 13, fontWeight: '700' },
  supportText: { marginTop: 16, textAlign: 'center', color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  backText: { marginTop: 18, textAlign: 'center', color: colors.muted, fontSize: 14, fontWeight: '700' },
});
