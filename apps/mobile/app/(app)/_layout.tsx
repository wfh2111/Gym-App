import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/authStore';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  today: { active: 'today', inactive: 'today-outline' },
  nutrition: { active: 'restaurant', inactive: 'restaurant-outline' },
  training: { active: 'barbell', inactive: 'barbell-outline' },
  coach: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  progress: { active: 'trending-up', inactive: 'trending-up-outline' },
};

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;
  if (!user?.onboardingCompletedAt) return <Redirect href="/onboarding/chat" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="training" options={{ title: 'Training' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
