import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConversationDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

export default function OnboardingChatScreen() {
  const { spacing } = useTheme();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ConversationDTO['messages'][number]>>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['onboarding-session'],
    queryFn: () => api.get<ConversationDTO>('/api/onboarding/session'),
  });

  async function handleSend(text: string) {
    setError(null);
    setSending(true);

    queryClient.setQueryData<ConversationDTO>(['onboarding-session'], (prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              { id: `optimistic-${Date.now()}`, role: 'USER', content: text, createdAt: new Date().toISOString() },
            ],
          }
        : prev,
    );

    try {
      const result = await api.post<{ reply: string; isComplete: boolean }>('/api/onboarding/messages', { text });

      queryClient.setQueryData<ConversationDTO>(['onboarding-session'], (prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                { id: `reply-${Date.now()}`, role: 'ASSISTANT', content: result.reply, createdAt: new Date().toISOString() },
              ],
            }
          : prev,
      );

      if (result.isComplete) {
        router.replace('/onboarding/summary');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the coach. Check your connection and try again.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={session?.messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble role={item.role === 'USER' ? 'USER' : 'ASSISTANT'} content={item.content} />
          )}
          contentContainerStyle={{ padding: spacing.l24, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={isLoading ? <Text color="inkMuted">Loading...</Text> : null}
        />
        {error && (
          <Text color="danger" style={{ paddingHorizontal: spacing.l24, paddingBottom: spacing.s8 }}>
            {error}
          </Text>
        )}
        <ChatInput onSend={handleSend} loading={sending} placeholder="Type your answer..." />
      </KeyboardAvoidingView>
    </Screen>
  );
}
