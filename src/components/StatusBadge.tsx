import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const statusStyles = {
  assigned: { bg: '#ECFEFF', fg: colors.primaryDark, label: 'Assigned' },
  picked_up: { bg: '#E0F2FE', fg: '#075985', label: 'Picked Up' },
  out_for_delivery: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Out for Delivery' },
  delivering_now: { bg: '#FEF3C7', fg: '#B45309', label: 'Delivering Now' },
  delivered: { bg: '#DCFCE7', fg: colors.success, label: 'Delivered' },
  failed: { bg: '#FEE2E2', fg: colors.danger, label: 'Failed' },
  cancelled: { bg: '#E5E7EB', fg: '#4B5563', label: 'Cancelled' },
  completed: { bg: '#DCFCE7', fg: colors.success, label: 'Completed' },
} as const;

export function StatusBadge({ status }: { status: string }) {
  const current = statusStyles[status as keyof typeof statusStyles] ?? { bg: '#E6F4F1', fg: colors.primaryDark, label: status.replace(/_/g, ' ') };
  return (
    <View style={[styles.badge, { backgroundColor: current.bg }]}>
      <Text style={[styles.text, { color: current.fg }]}>{current.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.35 },
});
