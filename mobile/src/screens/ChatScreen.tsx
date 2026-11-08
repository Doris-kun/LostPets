import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { errorStatus } from '../api';
import { useLanguage } from '../context/language';
import type { ChatMessage } from '../types';
import { useTheme } from '../context/theme';
import { spacing } from '../theme';

/*
 * Trợ lý hướng dẫn cách dùng app.
 *
 * Tương đương components/ChatWidget.vue bên web, nhưng là một MÀN HÌNH riêng
 * chứ không phải ô nổi góc phải. Màn hình điện thoại hẹp, một ô chat nổi đè
 * lên danh sách thì che mất nội dung.
 *
 * Điều quan trọng nhất phải hiểu: server KHÔNG NHỚ GÌ giữa các lần gọi. Mỗi
 * lần hỏi, app gửi lại TOÀN BỘ đoạn hội thoại từ đầu. Trí nhớ nằm ở đây, trong
 * mảng messages — không nằm ở server.
 */

// Khớp giới hạn bên back-end. Vượt quá thì server trả 400.
const MAX_TURNS = 20;
const MAX_CHARS = 1000;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();

  /*
   * Lời chào KHÔNG nằm trong mảng này.
   *
   * Nó là câu viết sẵn của app, không phải do AI sinh ra. Nhét vào rồi gửi
   * ngược lên server là bắt AI đọc lại chính lời chào của mình — tốn chỗ và
   * dễ làm nó lẫn lộn.
   */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    if (messages.length >= MAX_TURNS) {
      setError(t('chat.tooLong'));
      return;
    }

    // Khai kiểu rõ ràng, nếu không TypeScript đoán role là string chứ không
    // phải 'user' | 'assistant', rồi api.chat từ chối nhận.
    const next: ChatMessage[] = [
      ...messages,
      { role: 'user', content: content.slice(0, MAX_CHARS) },
    ];
    setMessages(next);
    setDraft('');
    setError('');
    setSending(true);

    try {
      const { data } = await api.chat(next);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const status = errorStatus(err);
      const key =
        status === 503
          ? 'chat.off'
          : // includes() doi dung mot so, ma status co the la undefined khi khong
            // goi toi duoc may chu. Chan bang ?? 0 — khong ma nao la 0 ca.
            [429, 504].includes(status ?? 0)
            ? 'chat.busy'
            : 'chat.error';
      setError(t(key));

      // Bỏ câu vừa gửi ra khỏi hội thoại và trả lại vào ô nhập, để người dùng
      // bấm gửi lại được ngay thay vì phải gõ lại từ đầu.
      setMessages(messages);
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setDraft('');
    setError('');
  };

  // Ba câu hỏi gợi ý, chỉ hiện khi chưa ai nói gì — để người dùng biết hỏi gì.
  const suggestions = [t('chat.s1'), t('chat.s2'), t('chat.s3')];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Trừ đi chiều cao thanh đầu, không thì bàn phím đẩy quá tay
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_item, index) => String(index)}
        // contentContainerStyle của FlatList chưa nhận className
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.md }}
        // Tin mới nhất nằm dưới cùng -> tự cuộn xuống khi có tin mới
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View className="mb-sm">
            <View className="max-w-[88%] rounded-lg rounded-tl-sm border border-ai-border bg-ai-bg px-md py-2.5">
              <Text className="text-[14px] leading-5 text-text">{t('chat.greeting')}</Text>
            </View>

            {messages.length === 0 && (
              <View className="mt-md gap-sm">
                {suggestions.map((question) => (
                  <TouchableOpacity
                    key={question}
                    className="self-start rounded-full border-[1.5px] border-border-strong bg-background px-md py-2"
                    onPress={() => send(question)}
                    activeOpacity={0.8}
                    // Chip cao 33, nới 6 trên 6 dưới cho đủ 44 (chỉ nới dọc)
                    hitSlop={{ top: 6, bottom: 6 }}
                  >
                    <Text className="text-[13px] font-semibold text-text-soft">{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          return (
            <View className={`mt-sm flex-row ${mine ? 'justify-end' : ''}`}>
              {/* Bong bóng của mình bo góc trên PHẢI nhọn, của máy thì góc
                  trên TRÁI nhọn — nhìn là biết ai nói, khỏi cần nhãn tên. */}
              <View
                className={
                  mine
                    ? 'max-w-[88%] rounded-lg rounded-tr-sm bg-primary px-md py-2.5'
                    : 'max-w-[88%] rounded-lg rounded-tl-sm border border-ai-border bg-ai-bg px-md py-2.5'
                }
              >
                <Text
                  className={`text-[14px] leading-5 ${mine ? 'text-on-primary' : 'text-text'}`}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {sending && (
              <View className="mt-sm flex-row">
                <View className="max-w-[88%] flex-row items-center gap-sm rounded-lg rounded-tl-sm border border-ai-border bg-ai-bg px-md py-2.5">
                  <ActivityIndicator size="small" color={colors.aiText} />
                  <Text className="text-[13px] text-text-muted">{t('chat.thinking')}</Text>
                </View>
              </View>
            )}

            {!!error && (
              <Text className="mt-md text-center text-[12.5px] leading-[18px] text-danger">
                {error}
              </Text>
            )}

            {messages.length > 0 && !sending && (
              <TouchableOpacity
                className="mt-lg min-h-11 items-center justify-center self-center px-sm"
                onPress={reset}
                activeOpacity={0.7}
              >
                <Text className="text-[13px] font-bold text-text-muted">{t('chat.reset')}</Text>
              </TouchableOpacity>
            )}
          </>
        }
      />

      <View
        className="flex-row items-end gap-sm border-t border-border-light bg-background px-lg pt-sm"
        // Cộng với vạch Home của máy, mỗi máy một số
        style={{ paddingBottom: spacing.sm + insets.bottom }}
      >
        <TextInput
          className="max-h-[110px] flex-1 rounded-lg border-[1.5px] border-border-strong px-md py-2.5 text-[14px] text-text"
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_CHARS}
          multiline
          // Gõ Enter là gửi luôn, khỏi phải với tay sang nút
          onSubmitEditing={() => send(draft)}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
          className={`min-h-11 justify-center rounded-lg bg-ai-accent px-lg py-3 ${
            !draft.trim() || sending ? 'opacity-45' : ''
          }`}
          onPress={() => send(draft)}
          disabled={!draft.trim() || sending}
          activeOpacity={0.85}
        >
          <Text className="text-[14px] font-bold text-on-primary">{t('chat.send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
