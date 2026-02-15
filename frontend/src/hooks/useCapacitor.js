import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useCapacitor = () => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (!isNative) return;

    const initNative = async () => {
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setBackgroundColor({ color: '#0d9488' });
      } catch {}

      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open');
        });
      } catch {}

      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          }
        });
      } catch {}
    };

    initNative();
  }, [isNative]);

  return { isNative, platform };
};
