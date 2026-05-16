import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { BootSplash } from '@/components/BootSplash';
import { useAuth } from '@/context/AuthContext';

type RuntimeGlobal = typeof globalThis & {
  __RXEX_KEEP_AWAKE_HANDLER__?: boolean;
  ErrorUtils?: {
    getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
    setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
  };
};

if (__DEV__) {
  const runtimeGlobal = globalThis as RuntimeGlobal;

  LogBox.ignoreLogs(['Unable to activate keep awake']);

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg ?? '')).join(' ');
    if (message.includes('Unable to activate keep awake')) {
      return;
    }
    originalConsoleError(...args);
  };

  const errorUtils = runtimeGlobal.ErrorUtils;
  const originalGlobalHandler = errorUtils?.getGlobalHandler?.();
  if (errorUtils?.setGlobalHandler && !runtimeGlobal.__RXEX_KEEP_AWAKE_HANDLER__) {
    runtimeGlobal.__RXEX_KEEP_AWAKE_HANDLER__ = true;
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      if (String(error?.message || '').includes('Unable to activate keep awake')) {
        return;
      }
      originalGlobalHandler?.(error, isFatal);
    });
  }
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <>
        <StatusBar style="dark" />
        <BootSplash />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}