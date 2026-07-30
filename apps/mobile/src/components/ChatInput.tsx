import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

interface ChatInputProps {
  onSend: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, loading, placeholder }: ChatInputProps) {
  const { colors, spacing, radius } = useTheme();
  const [value, setValue] = useState('');

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.s8,
        padding: spacing.m16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder ?? 'Type a message'}
        placeholderTextColor={colors.inkFaint}
        multiline
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg20,
          paddingHorizontal: spacing.m16,
          paddingVertical: spacing.s8 + 2,
          maxHeight: 120,
          color: colors.ink,
          backgroundColor: colors.surface,
        }}
      />
      <Pressable
        onPress={handleSend}
        disabled={loading || !value.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading || !value.trim() ? 0.5 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="arrow-up" size={20} color="#FFFFFF" />}
      </Pressable>
    </View>
  );
}
