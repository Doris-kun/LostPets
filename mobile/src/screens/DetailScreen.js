import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import claim from '../claim';
import ClaimCodeModal from '../components/ClaimCodeModal';
import { WEB_URL } from '../config';
import { useLanguage } from '../context/language';
import { radius, spacing, statusStyle } from '../theme';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';

/*
 * Màn hình chi tiết một tin.
 *
 * Chứa chữ D (Delete) của CRUD, và nút Sửa dẫn sang màn form.
 * Tương đương pages/PetDetail.jsx bên web, bỏ phần chia sẻ và đánh dấu đoàn tụ.
 */

export default function DetailScreen({ route, navigation }) {
  // Tham số truyền từ màn trước: navigation.navigate('Detail', { id: ... })
  // Tương đương useParams() của react-router bên web.
  const { id } = route.params;
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // Đang gửi yêu cầu đánh dấu đoàn tụ -> khoá nút, đổi chữ thành "Đang lưu..."
  const [resolving, setResolving] = useState(false);

  // Phần AI đối chiếu: đang chạy, kết quả, lỗi
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState('');

  // Đang xin mã cho việc gì: 'delete', 'resolve', hoặc null khi không hỏi
  const [askCode, setAskCode] = useState(null);
  const [codeError, setCodeError] = useState('');
  // Đang kiểm tra quyền sửa, khoá nút để tránh bấm hai lần
  const [checkingEdit, setCheckingEdit] = useState(false);

  // Tải lại mỗi khi quay về màn này -> sửa tin xong bấm Back là thấy ngay dữ liệu mới
  useFocusEffect(
    useCallback(() => {
      let ignore = false;

      api
        .getPet(id)
        .then(({ data }) => {
          if (!ignore) setPet(data);
        })
        .catch(() => {
          if (!ignore) setPet(null);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });

      return () => {
        ignore = true;
      };
    }, [id]),
  );

  /*
   * Đánh dấu đoàn tụ và Xoá đều cần mã xác nhận, và đều có thể bị 403.
   *
   * Hai hàm dưới nhận mã qua tham số thay vì tự đi lấy. Nhờ vậy khi 403, mình
   * mở hộp thoại xin mã rồi GỌI LẠI CHÍNH NÓ với mã người dùng vừa gõ — không
   * phải viết lại logic lần hai.
   *
   * code === undefined nghĩa là "tự lấy mã trong máy", còn truyền chuỗi vào
   * nghĩa là "dùng đúng mã này".
   */
  const doResolve = async (code) => {
    setResolving(true);
    try {
      // PUT chỉ gửi trường muốn đổi, các trường khác giữ nguyên.
      const useCode = code ?? (await claim.get(id));
      const { data } = await api.updatePet(id, { resolved: true }, useCode);
      setPet(data);

      // Mã gõ tay mà đúng thì cất lại, lần sau khỏi gõ nữa
      if (code) await claim.save(id, code);

      setAskCode(null);
      return true;
    } catch (err) {
      if (err.response?.status === 403) return false;

      Alert.alert(t('error.title'), t('error.saveFailed'));
      setAskCode(null);
      return true; // lỗi khác thì đừng hỏi mã, hỏi cũng vô ích
    } finally {
      setResolving(false);
    }
  };

  const handleResolve = () => {
    Alert.alert(t('detail.resolveTitle'), t('detail.resolveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          const ok = await doResolve();
          // Không có quyền -> mở hộp thoại xin mã thay vì báo lỗi rồi chịu thua
          if (!ok) {
            setCodeError('');
            setAskCode('resolve');
          }
        },
      },
    ]);
  };

  /*
   * Nhờ AI đối chiếu bài này với các bài NGƯỢC LOẠI.
   *
   * Bài "bị mất" thì quét các bài "tìm thấy" và ngược lại. Server chọn ra vài
   * ứng viên gần nhất rồi đưa AI xem ảnh, chấm điểm 0-100 kèm lý do. Chỉ trả
   * về những bài đạt từ 40 điểm — dưới mức đó là đoán mò, hiện ra chỉ gây
   * hy vọng hão.
   *
   * Đây là lý do app tồn tại: nối người mất với người nhặt được.
   */
  const findMatches = async () => {
    setMatchLoading(true);
    setMatchError('');

    try {
      const { data } = await api.findMatches(id);
      setMatchResult(data);
    } catch (err) {
      const status = err.response?.status;
      setMatchError(t([429, 504].includes(status) ? 'match.busy' : 'match.error'));
    } finally {
      setMatchLoading(false);
    }
  };

  const handleShare = async () => {
    /*
     * Share của React Native gọi thẳng bảng chia sẻ của HỆ ĐIỀU HÀNH — cái
     * bảng trượt lên có sẵn Zalo, Messenger, Tin nhắn, Sao chép...
     *
     * Web phải dùng navigator.share, mà nó chỉ có trên vài trình duyệt, không
     * có thì phải quay về chép link vào clipboard. Trên điện thoại thì luôn có.
     *
     * Gửi kèm link tới bản web chứ không phải link trong app: người nhận chưa
     * chắc đã cài app, bấm vào vẫn xem được tin bằng trình duyệt.
     */
    const lines = [
      t(pet.type === 'lost' ? 'detail.shareLost' : 'detail.shareFound'),
      `${pet.name || pet.breed} — ${pet.species} · ${pet.breed}`,
      `${t('detail.shareArea')}: ${pet.area}`,
      `${t('detail.shareContact')}: ${pet.contact}`,
      `${WEB_URL}/pet/${pet._id}`,
    ];

    try {
      await Share.share({ message: lines.join('\n'), title: pet.name || pet.breed });
    } catch {
      // Người dùng đóng bảng chia sẻ giữa chừng cũng vào đây. Không phải lỗi,
      // nên không báo gì cả.
    }
  };

  /*
   * Kiểm tra quyền sửa TRƯỚC khi mở form.
   *
   * Trước đây bấm Sửa là vào thẳng form. Người dùng điền xong xuôi, bấm Lưu,
   * rồi mới nhận 403 — mất trắng công gõ. Giờ hỏi mã ngay từ đầu như nút Xoá.
   *
   * Cách kiểm: gửi một lệnh cập nhật RỖNG. Back-end vẫn chạy đủ phần kiểm tra
   * quyền, nhưng danh sách trường được phép sửa lọc ra rỗng nên không có gì
   * thay đổi. Đúng quyền thì trả 200, sai thì 403. Không cần thêm endpoint mới.
   */
  const canEdit = async (code) => {
    try {
      const useCode = code ?? (await claim.get(id));
      await api.updatePet(id, {}, useCode);
      if (code) await claim.save(id, code);
      return true;
    } catch (err) {
      if (err.response?.status === 403) return false;
      // Lỗi khác (mất mạng, server hỏng) thì cứ cho vào form, để người dùng
      // gặp lỗi thật lúc bấm Lưu thay vì bị chặn ở đây mà không hiểu vì sao.
      return true;
    }
  };

  const openEditForm = async () => {
    /*
     * Lấy lại bài từ server trước khi mở form.
     *
     * Vừa nhập đúng mã thì server mới chịu trả về đặc điểm bí mật. Dùng bản
     * `pet` đang có trong màn hình thì trường đó vẫn thiếu, và form sẽ tưởng
     * là mình không có quyền sửa nó.
     */
    try {
      const { data } = await api.getPet(id);
      navigation.navigate('Form', { mode: 'edit', pet: data });
    } catch {
      navigation.navigate('Form', { mode: 'edit', pet });
    }
  };

  const handleEdit = async () => {
    setCheckingEdit(true);
    const ok = await canEdit();
    setCheckingEdit(false);

    if (ok) {
      openEditForm();
      return;
    }

    setCodeError('');
    setAskCode('edit');
  };

  const doDelete = async (code) => {
    setDeleting(true);
    try {
      // Mã xác nhận được cất lúc đăng bài. Bài cũ hoặc bài đăng từ máy khác
      // thì máy này không giữ mã — gửi rỗng, back-end tự quyết định.
      const useCode = code ?? (await claim.get(id));
      await api.deletePet(id, useCode);
      await claim.remove(id);
      navigation.goBack();
      return true;
    } catch (err) {
      setDeleting(false);
      if (err.response?.status === 403) return false;

      Alert.alert(t('error.title'), t('error.deleteFailed'));
      setAskCode(null);
      return true;
    }
  };

  const handleDelete = () => {
    /*
     * React Native KHÔNG có window.confirm() như trình duyệt.
     * Thay bằng Alert.alert() — hộp thoại gốc của hệ điều hành.
     * Nó KHÔNG chặn luồng chạy như confirm(), mà gọi lại qua hàm onPress,
     * nên không viết được kiểu `if (!confirm(...)) return;`.
     */
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteConfirm'), [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const ok = await doDelete();
          if (!ok) {
            setCodeError('');
            setAskCode('delete');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t('detail.notFound')}</Text>
      </View>
    );
  }

  const status = statusStyle(pet, colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>🐾</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: status.color }]}>
          <Text style={styles.badgeText}>{t(status.labelKey)}</Text>
        </View>
        {!!pet.postId && <Text style={styles.postId}>{pet.postId}</Text>}
      </View>

      {/* Tin đã đoàn tụ: báo rõ bằng một dải màu, không chỉ ẩn nút đi */}
      {pet.resolved && (
        <View style={styles.resolvedBanner}>
          <Text style={styles.resolvedIcon}>✓</Text>
          <Text style={styles.resolvedBannerText}>{t('detail.resolvedBanner')}</Text>
        </View>
      )}

      <Text style={styles.title}>{pet.name || pet.breed}</Text>
      <Text style={styles.subtitle}>
        {pet.species} · {pet.breed}
      </Text>

      <View style={styles.infoRow}>
        <InfoBox label={t('detail.color')} value={pet.color} />
        <InfoBox label={t('detail.area')} value={pet.area} />
      </View>

      {!!pet.description && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>{t('detail.desc')}</Text>
          <Text style={styles.blockText}>{pet.description}</Text>
        </View>
      )}

      <View style={styles.contactBox}>
        <Text style={styles.contactLabel}>{t('detail.contact')}</Text>
        <Text style={styles.contactValue}>{pet.contact}</Text>
      </View>

      {/* Cảnh báo đặt ngay dưới số liên hệ — đúng lúc người ta sắp bấm gọi */}
      <View style={styles.scamBox}>
        <Text style={styles.scamIcon}>⚠</Text>
        <Text style={styles.scamText}>{t('scam.warning')}</Text>
      </View>

      {/*
        Đặc điểm bí mật. Server chỉ trả trường này về cho CHỦ bài — người đăng
        nhập đúng tài khoản, hoặc máy đang giữ mã xác nhận. Khách xem bài không
        bao giờ nhận được, nên không cần kiểm tra quyền ở đây: không có dữ liệu
        thì ô tự không hiện.
      */}
      {!!pet.secretDetail && (
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>🔒  {t('secret.yours')}</Text>
          <Text style={styles.secretValue}>{pet.secretDetail}</Text>
          <Text style={styles.secretHint}>{t('secret.howToUse')}</Text>
        </View>
      )}

      {/*
        Đối chiếu AI — chỉ hiện với bài CHƯA đoàn tụ. Tìm chủ cho con vật đã
        về nhà rồi thì vô nghĩa, bày nút ra chỉ tốn lượt gọi AI.
      */}
      {!pet.resolved && (
        <View style={styles.matchBox}>
          <Text style={styles.matchTitle}>{t('match.title')}</Text>
          <Text style={styles.matchSubtitle}>{t('match.subtitle')}</Text>

          <TouchableOpacity
            style={[styles.matchButton, matchLoading && styles.buttonDisabled]}
            onPress={findMatches}
            disabled={matchLoading}
            activeOpacity={0.85}
          >
            {matchLoading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.matchButtonText}>✨  {t('match.action')}</Text>
            )}
          </TouchableOpacity>

          {matchLoading && <Text style={styles.matchNote}>{t('match.wait')}</Text>}
          {!!matchError && <Text style={styles.matchErrorText}>{matchError}</Text>}

          {/* Có kết quả rồi: hoặc danh sách bài khớp, hoặc câu "chưa tìm thấy" */}
          {!!matchResult &&
            !matchLoading &&
            (matchResult.matches.length > 0 ? (
              <View style={styles.matchList}>
                {matchResult.matches.map((item) => (
                  <TouchableOpacity
                    key={item.pet._id}
                    style={styles.matchItem}
                    onPress={() => navigation.push('Detail', { id: item.pet._id })}
                    activeOpacity={0.85}
                  >
                    {!!item.pet.image && (
                      <Image source={{ uri: item.pet.image }} style={styles.matchImage} />
                    )}

                    <View style={styles.matchItemBody}>
                      <View style={styles.matchScorePill}>
                        <Text style={styles.matchScoreText}>
                          {t('match.score', { n: item.score })}
                        </Text>
                      </View>

                      <Text style={styles.matchItemTitle} numberOfLines={1}>
                        {item.pet.name || item.pet.breed}
                      </Text>
                      <Text style={styles.matchReason}>{item.reason}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.matchNote}>
                {t('match.none')} {t('match.checked', { n: matchResult.candidatesChecked })}
              </Text>
            ))}
        </View>
      )}

      <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
        <Text style={styles.shareText}>↗  {t('detail.share')}</Text>
      </TouchableOpacity>

      {/* Chỉ hiện khi tin chưa được đánh dấu — đã đoàn tụ rồi thì không lùi lại */}
      {!pet.resolved && (
        <TouchableOpacity
          style={[styles.resolveButton, resolving && styles.buttonDisabled]}
          onPress={handleResolve}
          disabled={resolving}
          activeOpacity={0.85}
        >
          <Text style={styles.resolveText}>
            {t(resolving ? 'detail.resolving' : 'detail.resolve')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={handleEdit}
          disabled={checkingEdit}
        >
          <Text style={styles.buttonOutlineText}>{t('detail.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, deleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.buttonDangerText}>{t(deleting ? 'detail.deleting' : 'detail.delete')}</Text>
        </TouchableOpacity>
      </View>
      {/*
        Xin mã khi back-end trả 403. Gõ đúng thì việc đang làm dở chạy tiếp
        ngay, không phải bấm lại từ đầu.
      */}
      <ClaimCodeModal
        visible={!!askCode}
        mode="ask"
        error={codeError}
        onClose={() => setAskCode(null)}
        onSubmit={async (typed) => {
          const run =
            askCode === "delete" ? doDelete : askCode === "edit" ? canEdit : doResolve;
          const ok = await run(typed);

          // Nhập đúng mã để sửa -> đóng hộp thoại rồi mở form
          if (ok && askCode === "edit") {
            setAskCode(null);
            openEditForm();
            return;
          }
          // Vẫn 403 nghĩa là gõ sai — giữ hộp thoại mở để gõ lại
          if (!ok) setCodeError(t('claim.wrong'));
        }}
      />
    </ScrollView>
  );
}

function InfoBox({ label, value }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notFound: { color: colors.textMuted, fontSize: 15 },

  image: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surface },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 56, opacity: 0.3 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { color: colors.onStatus, fontSize: 12, fontWeight: '700' },
  postId: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },

  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

  infoRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  infoBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },

  block: { marginTop: spacing.lg },
  blockLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  blockText: { fontSize: 14, color: colors.textSoft, lineHeight: 21, marginTop: 6 },

  contactBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.contactBg,
    borderWidth: 1,
    borderColor: colors.contactBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  contactLabel: { fontSize: 11, fontWeight: '700', color: colors.teal, letterSpacing: 0.5 },
  contactValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },

  scamBox: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  scamIcon: { fontSize: 14, color: colors.warnText, marginTop: 1 },
  scamText: { flex: 1, fontSize: 12.5, color: colors.warnText, lineHeight: 18 },

  secretBox: {
    marginTop: spacing.md,
    backgroundColor: colors.secretBg,
    borderWidth: 1,
    borderColor: colors.secretBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  secretLabel: { fontSize: 11, fontWeight: "700", color: colors.secretText, letterSpacing: 0.4 },
  secretValue: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 6 },
  secretHint: { fontSize: 11.5, color: colors.secretText, lineHeight: 17, marginTop: 6 },

  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.sky,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  resolvedIcon: { fontSize: 15, fontWeight: '800', color: colors.resolved },
  resolvedBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.resolved },

  matchBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.aiBg,
    borderWidth: 1,
    borderColor: colors.aiBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  matchTitle: { fontSize: 15, fontWeight: "800", color: colors.aiText },
  matchSubtitle: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  matchButton: {
    marginTop: spacing.md,
    backgroundColor: colors.aiAccent,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  matchButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: "700" },
  matchNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  matchErrorText: { fontSize: 12, color: colors.danger, textAlign: "center", marginTop: spacing.sm },

  matchList: { marginTop: spacing.md, gap: spacing.sm },
  matchItem: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  matchImage: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surface },
  matchItemBody: { flex: 1, marginLeft: spacing.md, justifyContent: "center" },
  matchScorePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.aiAccent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  matchScoreText: { color: colors.onPrimary, fontSize: 10.5, fontWeight: "800" },
  matchItemTitle: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 4 },
  matchReason: { fontSize: 12, color: colors.textSoft, lineHeight: 17, marginTop: 2 },

  shareButton: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  shareText: { color: colors.textSoft, fontWeight: '700', fontSize: 14 },

  resolveButton: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.resolved,
    alignItems: 'center',
  },
  resolveText: { color: colors.resolved, fontWeight: '700', fontSize: 14 },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: { borderWidth: 2, borderColor: colors.border },
  buttonOutlineText: { color: colors.textSoft, fontWeight: '700', fontSize: 14 },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDangerText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
  }),
);
