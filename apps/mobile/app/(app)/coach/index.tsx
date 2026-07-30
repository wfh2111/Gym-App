import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ConversationDTO, CoachMessageDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

interface ConversationSummary {
  id: string;
  type: string;
  status: string;
  startedAt: string;
}

export default function CoachScreen() {
  const { spacing } = useTheme();
  const [messages, setMessages] = useState<CoachMessageDTO[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<CoachMessageDTO>>(null);
  const seededRef = useRef(false);

  const { data: conversations } = useQuery({
    queryKey: ['coach-conversations'],
    queryFn: () => api.get<ConversationSummary[]>('/api/coach/conversations'),
  });

  const activeId = conversations?.find((c) => c.type === 'COACH' && c.status === 'ACTIVE')?.id;

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['coach-conversation', activeId],
    queryFn: () => api.get<ConversationDTO>(`/api/coach/conversations/${activeId}`),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (conversation && !seededRef.current) {
      seededRef.current = true;
      setMessages(conversation.messages);
      setConversationId(conversation.id);
    }
  }, [conversation]);

  async function handleSend(text: string) {
    setError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `optimistic-${Date.now()}`, role: 'USER', content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const result = await api.post<{ conversationId: string; reply: string }>('/api/coach/messages', {
        conversationId,
        text,
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, role: 'ASSISTANT', content: result.reply, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not reach the coach. Check your connection and try again.',
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.l24,
            paddingBottom: 0,
          }}
        >
          <Text variant="display">Coach</Text>
          <Text color="accent" onPress={() => router.push('/coach/weekly-checkin')}>
            Weekly check-in
          </Text>
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
          ListEmptyComponent={
            isLoading && activeId ? (
              <Text color="inkMuted">Loading...</Text>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text color="inkMuted" style={{ textAlign: 'center' }}>
                  Ask about your training, nutrition, recovery, or supplements.
                </Text>
              </View>
            )
          }
        />

        {error && (
          <Text color="danger" style={{ paddingHorizontal: spacing.l24, paddingBottom: spacing.s8 }}>
            {error}
          </Text>
        )}
        <ChatInput onSend={handleSend} loading={sending} placeholder="Ask your coach..." />
      </KeyboardAvoidingView>
    </Screen>
  );
}
