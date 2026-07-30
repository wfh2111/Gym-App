import React from 'react';
import { View } from 'react-native';
import { Screen } from './Screen';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

/** Temporary placeholder for a route not yet built out in the current build phase. */
export function ComingSoon({ title }: { title: string }) {
  const { spacing } = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.s8 }}>
        <Text variant="heading">{title}</Text>
        <Text color="inkMuted">This screen is coming in a later build phase.</Text>
      </View>
    </Screen>
  );
}
