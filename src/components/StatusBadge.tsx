import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const statusMap: Record<string, { bg: string; fg: string; label: string }> = {
  new:              { bg: '#F3F4F6', fg: '#374151', label: 'New' },
  assigned:         { ...colors.statusAssigned, label: 'Assigned' },
  picked_up:        { ...colors.statusPickedUp, label: 'Picked Up' },
  in_transit:       { ...colors.statusInTransit, label: 'In Transit' },
  dispatched:       { bg: '#E0E7FF', fg: '#4338CA', label: 'Dispatched' },
  out_for_delivery: { ...colors.statusOutForDelivery, label: 'Out for Delivery' },
  delivering_now:   { ...colors.statusDeliveringNow, label: 'Delivering Now' },
  delivered:        { ...colors.statusDelivered, label: 'Delivered' },
  completed:        { ...colors.statusDelivered, label: 'Completed' },
  failed:           { ...colors.statusFailed, label: 'Failed' },
  cancelled:        { ...colors.statusCancelled, label: 'Cancelled' },
};

export function StatusBadge({ status }: { status: string }) {
  const current = statusMap[status] ?? {
    bg: '#E6F4F1',
    fg: colors.primaryDark,
    label: status.replace(/_/g, ' '),
  };

  return (
    <View style={[styles.badge, { backgroundColor: current.bg }]}>
      <Text style={[styles.text, { color: current.fg }]}>{current.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
});
