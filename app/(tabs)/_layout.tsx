import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="deliveries/index"
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pickups/index"
        options={{
          title: 'Pickups',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="store-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="qrcode-scan" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="history" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="home" options={{ href: null }} />
    </Tabs>
  );
}
