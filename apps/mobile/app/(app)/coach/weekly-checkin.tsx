import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import type { ConversationDTO, CoachMessageDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

export default function WeeklyCheckinScreen() {
  const { spacing } = useTheme();
  const [messages, setMessages] = useState<CoachMessageDTO[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const listRef = useRef<FlatList<CoachMessageDTO>>(null);

  useEffect(() => {
    (async () => {
      try {
        const conversation = await api.post<ConversationDTO>('/api/coach/weekly-checkin/start');
        setMessages(conversation.messages);
        setComplete(conversation.status === 'COMPLETED');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not start the check-in.');
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []);

  async function handleSend(text: string) {
    setError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `optimistic-${Date.now()}`, role: 'USER', content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const result = await api.post<{ reply: string; isComplete: boolean; planRegenerated: boolean }>(
        '/api/coach/weekly-checkin',
        { text },
      );
      setMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, role: 'ASSISTANT', content: result.reply, createdAt: new Date().toISOString() },
      ]);
      if (result.isComplete) setComplete(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the coach. Try again.');
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
        <View style={{ padding: spacing.l24, paddingBottom: 0 }}>
          <Text variant="display">Weekly check-in</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble role={item.role === 'USER' ? 'USER' : 'ASSISTANT'} content={item.content} />
          )}
          contentContainerStyle={{ padding: spacing.l24, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={loadingInitial ? <Text color="inkMuted">Loading...</Text> : null}
        />

        {error && (
          <Text color="danger" style={{ paddingHorizontal: spacing.l24, paddingBottom: spacing.s8 }}>
            {error}
          </Text>
        )}

        {complete ? (
          <View style={{ padding: spacing.l24, gap: spacing.s8 }}>
            <Button label="View your updated plan" onPress={() => router.replace('/(app)/today')} />
          </View>
        ) : (
          <ChatInput onSend={handleSend} loading={sending} placeholder="Type your answer..." />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
