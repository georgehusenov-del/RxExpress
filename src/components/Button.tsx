import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'dark' | 'danger' | 'outline';
  style?: StyleProp<ViewStyle>;
};

export function Button({ variant = 'primary', ...props }: Props) {
  const mappedVariant = variant === 'dark' ? 'secondary' : variant;
  return <PrimaryButton {...props} variant={mappedVariant} />;
}
