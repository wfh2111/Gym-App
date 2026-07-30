import React from 'react';
import { ScrollView, View, type ViewProps, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function Screen({ scroll = false, padded = true, style, contentContainerStyle, children, ...props }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = padded ? spacing.l24 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding, paddingBottom: spacing.xxl48 }, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding }, style]} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
