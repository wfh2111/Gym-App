import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/lib/authStore';

export default function SettingsScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <Text variant="display">Settings</Text>

        <Card style={{ gap: theme.spacing.xs4 }}>
          <Text color="inkMuted" variant="caption">
            Signed in as
          </Text>
          <Text variant="bodyMedium">{user?.email}</Text>
        </Card>

        <View style={{ gap: theme.spacing.s8 }}>
          <SettingsRow
            label="Connected devices"
            subtitle="Wearables and health apps"
            icon="watch-outline"
            onPress={() => router.push('/settings/integrations')}
          />
          <SettingsRow
            label="Subscription"
            subtitle="Manage your plan"
            icon="card-outline"
            onPress={() => router.push('/settings/subscription')}
          />
        </View>

        <Button label="Sign out" variant="ghost" onPress={handleSignOut} />
      </View>
    </Screen>
  );
}

function SettingsRow({
  label,
  subtitle,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m16 }}>
        <Ionicons name={icon} size={22} color={theme.colors.ink} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">{label}</Text>
          <Text color="inkMuted" variant="caption">
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
      </Card>
    </Pressable>
  );
}
