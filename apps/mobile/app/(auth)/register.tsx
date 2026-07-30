import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Link, router } from 'expo-router';
import type { AuthResponse } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

export default function RegisterScreen() {
  const theme = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.post<AuthResponse>(
        '/api/auth/register',
        { email, password, timezone },
        { auth: false },
      );
      await signIn(res.token, res.user);
      router.replace('/onboarding/chat');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const input = inputStyle(theme);

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.xxl48 }}>
        <View style={{ gap: theme.spacing.xs4 }}>
          <Text variant="display">Create your account</Text>
          <Text color="inkMuted">A couple minutes of setup, then we&apos;ll talk through your plan.</Text>
        </View>

        <View style={{ gap: theme.spacing.m16 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.colors.inkFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={theme.colors.inkFaint}
            secureTextEntry
            style={input}
          />
        </View>

        {error && <Text color="danger">{error}</Text>}

        <Button label="Create account" onPress={handleSubmit} loading={loading} disabled={!email || password.length < 8} />

        <Link href="/(auth)/login" asChild>
          <Text color="accent" style={{ textAlign: 'center' }}>
            Already have an account? Sign in
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md12,
    paddingHorizontal: theme.spacing.m16,
    paddingVertical: theme.spacing.m16,
    fontSize: 16,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
  };
}
