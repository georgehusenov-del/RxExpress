import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'primary', style }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [styles.base, styles[variant], blocked && styles.disabled, pressed && !blocked && styles.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primaryDark : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, variant === 'outline' ? styles.outlineText : null, blocked && styles.disabledText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#002B3A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryDark },
  danger: { backgroundColor: colors.danger },
  outline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.06, elevation: 1 },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  outlineText: { color: colors.primaryDark },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled, shadowOpacity: 0, elevation: 0 },
  disabledText: { color: '#EAF4F6' },
  pressed: { opacity: 0.9 },
});
