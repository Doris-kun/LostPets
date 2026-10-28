import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

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
  const styles = useThemedStyles(themedStyles);

  /*
   * Lời chào KHÔNG nằm trong mảng này.
   *
   * Nó là câu viết sẵn của app, không phải do AI sinh ra. Nhét vào rồi gửi
   * ngược lên server là bắt AI đọc lại chính lời chào của mình — tốn chỗ và
   * dễ làm nó lẫn lộn.
   */
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef(null);

  const send = async (text) => {
    const content = text.trim();
    if (!content || sending) return;

    if (messages.length >= MAX_TURNS) {
      setError(t('chat.tooLong'));
      return;
    }

    const next = [...messages, { role: 'user', content: content.slice(0, MAX_CHARS) }];
    setMessages(next);
    setDraft('');
    setError('');
    setSending(true);

    try {
      const { data } = await api.chat(next);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const status = err.response?.status;
      const key =
        status === 503 ? 'chat.off' : [429, 504].includes(status) ? 'chat.busy' : 'chat.error';
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Trừ đi chiều cao thanh đầu, không thì bàn phím đẩy quá tay
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_item, index) => String(index)}
        contentContainerStyle={styles.list}
        // Tin mới nhất nằm dưới cùng -> tự cuộn xuống khi có tin mới
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.greetingWrap}>
            <View style={styles.bubbleBot}>
              <Text style={styles.bubbleBotText}>{t('chat.greeting')}</Text>
            </View>

            {messages.length === 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((question) => (
                  <TouchableOpacity
                    key={question}
                    style={styles.suggestion}
                    onPress={() => send(question)}
                    activeOpacity={0.8}
                    // Chip cao 33, nới 6 trên 6 dưới cho đủ 44 (chỉ nới dọc)
                    hitSlop={{ top: 6, bottom: 6 }}
                  >
                    <Text style={styles.suggestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={mine ? styles.bubbleMine : styles.bubbleBot}>
                <Text style={mine ? styles.bubbleMineText : styles.bubbleBotText}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {sending && (
              <View style={styles.bubbleRow}>
                <View style={[styles.bubbleBot, styles.thinking]}>
                  <ActivityIndicator size="small" color={colors.aiText} />
                  <Text style={styles.thinkingText}>{t('chat.thinking')}</Text>
                </View>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            {messages.length > 0 && !sending && (
              <TouchableOpacity style={styles.reset} onPress={reset} activeOpacity={0.7}>
                <Text style={styles.resetText}>{t('chat.reset')}</Text>
              </TouchableOpacity>
            )}
          </>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <TextInput
          style={styles.input}
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
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
          onPress={() => send(draft)}
          disabled={!draft.trim() || sending}
          activeOpacity={0.85}
        >
          <Text style={styles.sendText}>{t('chat.send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    list: { padding: spacing.lg, paddingBottom: spacing.md },

    greetingWrap: { marginBottom: spacing.sm },

    bubbleRow: { flexDirection: 'row', marginTop: spacing.sm },
    bubbleRowMine: { justifyContent: 'flex-end' },

    bubbleBot: {
      maxWidth: '88%',
      backgroundColor: colors.aiBg,
      borderWidth: 1,
      borderColor: colors.aiBorder,
      borderRadius: radius.lg,
      borderTopLeftRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    bubbleBotText: { fontSize: 14, color: colors.text, lineHeight: 20 },

    bubbleMine: {
      maxWidth: '88%',
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      borderTopRightRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    bubbleMineText: { fontSize: 14, color: colors.onPrimary, lineHeight: 20 },

    thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    thinkingText: { fontSize: 13, color: colors.textMuted },

    suggestions: { marginTop: spacing.md, gap: spacing.sm },
    suggestion: {
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    suggestionText: { fontSize: 13, fontWeight: '600', color: colors.textSoft },

    error: {
      fontSize: 12.5,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.md,
      lineHeight: 18,
    },

    reset: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.sm },
    resetText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    sendButton: {
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: colors.aiAccent,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: radius.lg,
    },
    sendDisabled: { opacity: 0.45 },
    sendText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
  }),
);
