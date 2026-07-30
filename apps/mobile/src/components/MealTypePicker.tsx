import React from 'react';
import { View, Pressable } from 'react-native';
import type { MealType } from '@gym-app/shared';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

const OPTIONS: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (v: MealType) => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.s8,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: selected ? colors.accent : colors.surfaceMuted,
            }}
          >
            <Text variant="caption" style={{ color: selected ? '#FFFFFF' : colors.inkMuted }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
