import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { brandLogo } from '@/theme/brand';
import { colors } from '@/theme/colors';

type Props = {
  size?: 'hero' | 'large' | 'medium' | 'small';
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
};

const dimensions = {
  hero: { width: 228, height: 228 },
  large: { width: 182, height: 182 },
  medium: { width: 132, height: 132 },
  small: { width: 72, height: 72 },
} as const;

export function AppLogo({ size = 'large', style, glow = false }: Props) {
  return (
    <View style={[styles.wrap, glow && styles.glowWrap, style]}>
      <Image source={brandLogo} resizeMode="contain" style={dimensions[size]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glowWrap: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
});
