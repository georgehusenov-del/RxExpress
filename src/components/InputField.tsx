import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

type Props = TextInputProps & {
  label?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  containerStyle?: StyleProp<ViewStyle>;
};

export function InputField({ label, icon, containerStyle, style, ...props }: Props) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.fieldWrap}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={colors.primaryDark} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, style]}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 13, fontWeight: '700', color: colors.navy },
  fieldWrap: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minHeight: 56, color: colors.text, fontSize: 15, paddingVertical: 0 },
});