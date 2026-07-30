import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface SetRowProps {
  setIndex: number;
  suggestedWeightKg?: number;
  targetRepLow: number;
  targetRepHigh: number;
  initialWeightKg?: number | null;
  initialReps?: number | null;
  initialRpe?: number | null;
  logged?: boolean;
  onLog: (values: { weightKg?: number; reps?: number; rpe?: number }) => void;
}

export function SetRow({
  setIndex,
  suggestedWeightKg,
  targetRepLow,
  targetRepHigh,
  initialWeightKg,
  initialReps,
  initialRpe,
  logged,
  onLog,
}: SetRowProps) {
  const { colors, spacing, radius } = useTheme();
  const [weight, setWeight] = useState(
    initialWeightKg != null ? String(initialWeightKg) : suggestedWeightKg != null ? String(suggestedWeightKg) : '',
  );
  const [reps, setReps] = useState(initialReps != null ? String(initialReps) : '');
  const [rpe, setRpe] = useState(initialRpe != null ? String(initialRpe) : '');

  function handleLog() {
    onLog({
      weightKg: weight ? Number(weight) : undefined,
      reps: reps ? Number(reps) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
    });
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s8 }}>
      <Text color="inkMuted" style={{ width: 18 }}>
        {setIndex + 1}
      </Text>
      <SmallInput value={weight} onChangeText={setWeight} placeholder="kg" />
      <SmallInput value={reps} onChangeText={setReps} placeholder={`${targetRepLow}-${targetRepHigh}`} />
      <SmallInput value={rpe} onChangeText={setRpe} placeholder="RPE" />
      <Pressable
        onPress={handleLog}
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: logged ? colors.success : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function SmallInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      keyboardType="numeric"
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm8,
        paddingVertical: spacing.s8,
        paddingHorizontal: spacing.s8,
        textAlign: 'center',
        color: colors.ink,
        backgroundColor: colors.surface,
      }}
    />
  );
}
