import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

export function ChatBubble({ role, content }: { role: 'USER' | 'ASSISTANT'; content: string }) {
  const { colors, spacing, radius } = useTheme();
  const isUser = role === 'USER';

  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: spacing.s8 }}>
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: isUser ? colors.accent : colors.surfaceMuted,
          borderRadius: radius.lg20,
          borderBottomRightRadius: isUser ? radius.sm8 : radius.lg20,
          borderBottomLeftRadius: isUser ? radius.lg20 : radius.sm8,
          paddingVertical: spacing.s8 + 2,
          paddingHorizontal: spacing.m16,
        }}
      >
        <Text style={{ color: isUser ? '#FFFFFF' : colors.ink }}>{content}</Text>
      </View>
    </View>
  );
}
