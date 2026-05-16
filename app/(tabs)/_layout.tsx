import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
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
        tabBarIcon: ({ focused, color }) => {
          const icon =
            route.name === 'home' ? 'view-dashboard-outline' :
            route.name === 'deliveries/index' ? 'truck-delivery-outline' :
            route.name === 'scan' ? 'qrcode-scan' :
            'history';

          const isScan = route.name === 'scan';

          return (
            <MaterialCommunityIcons
              name={icon}
              size={isScan ? 26 : 24}
              color={isScan ? '#FFFFFF' : color}
              style={isScan ? {
                backgroundColor: focused ? colors.primaryDark : colors.primary,
                padding: 12,
                borderRadius: 999,
                overflow: 'hidden',
                marginTop: -16,
              } : undefined}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="deliveries/index" options={{ title: 'Deliveries' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
