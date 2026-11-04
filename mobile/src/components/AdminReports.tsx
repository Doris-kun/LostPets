import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import type { AdminReport } from '../types';
import { THUMB_CARD, thumbnail } from '../image';
import { timeAgo } from './PetCard';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing, statusStyle } from '../theme';

/*
 * Danh sách báo cáo tin xấu, nằm trên đầu trang quản trị.
 *
 * Quản trị viên có đúng hai việc làm với một báo cáo:
 *   Bỏ qua  — báo cáo sai hoặc không đáng, xoá bản ghi báo cáo, tin giữ nguyên
 *   Xoá tin — báo cáo đúng, xoá hẳn tin đăng
 *
 * Tự gọi máy chủ và tự giữ dữ liệu, không nhận qua prop. Lý do: trang quản
 * trị đã có sẵn một danh sách tin phân trang riêng, nhét thêm một nguồn dữ
 * liệu nữa vào đó thì hai thứ tranh nhau cùng một đống state.
 *
 * KHÔNG CÓ BÁO CÁO NÀO THÌ KHÔNG VẼ GÌ CẢ — kể cả tiêu đề. Phần lớn thời
 * gian danh sách này rỗng, mà một tiêu đề "Báo cáo chờ xử lý (0)" nằm chình
 * ình trên đầu trang chỉ tổ chiếm chỗ.
 */

export interface AdminReportsProps {
  onOpenPet: (id: string) => void;
  /** Gọi sau khi xoá một tin, để trang ngoài tải lại số liệu và danh sách. */
  onPetDeleted: () => void;
}

export default function AdminReports({ onOpenPet, onPetDeleted }: AdminReportsProps) {
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  /** Báo cáo đang bị xử lý, để khoá đúng thẻ đó chứ không khoá cả danh sách. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.adminReports(1);
      setReports(data.reports);
      setTotal(data.total);
      setPages(data.pages);
      setPage(1);
    } catch {
      // Không tải được thì coi như không có báo cáo nào. Trang quản trị vẫn
      // dùng được cho việc chính là xem và xoá tin.
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (page >= pages) return;
    try {
      const { data } = await api.adminReports(page + 1);
      setReports((current) => {
        // Giữa lúc đang xem mà có người báo cáo thêm thì trang sau trả về một
        // bản ghi mình đã có. Hai dòng cùng _id là cảnh báo đỏ của React.
        const seen = new Set(current.map((r) => r._id));
        return [...current, ...data.reports.filter((r) => !seen.has(r._id))];
      });
      setPage(data.page);
    } catch {
      /* lần sau kéo lại */
    }
  };

  /** Xoá bản ghi báo cáo khỏi danh sách đang hiện, không gọi lại máy chủ. */
  const forget = (id: string) => {
    setReports((current) => current.filter((r) => r._id !== id));
    setTotal((n) => Math.max(0, n - 1));
  };

  const dismiss = (report: AdminReport) => {
    Alert.alert(t('admin.reports'), t('admin.reportConfirmDismiss'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.reportDismiss'),
        onPress: async () => {
          setBusyId(report._id);
          try {
            await api.adminDismissReport(report._id);
            forget(report._id);
          } catch {
            Alert.alert(t('admin.title'), t('admin.loadFailed'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const deletePost = (report: AdminReport) => {
    if (!report.pet) return;
    const petId = report.pet._id;

    Alert.alert(t('admin.reports'), t('admin.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.reportDeletePost'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(report._id);
          try {
            await api.adminDeletePet(petId);
            /*
             * Bỏ MỌI báo cáo trỏ tới tin vừa xoá, không chỉ cái đang bấm.
             * Một tin xấu thường bị nhiều người báo cáo; để lại mấy cái kia
             * thì quản trị viên bấm vào sẽ thấy "Tin đã bị xoá" một cách khó
             * hiểu, dù chính họ vừa xoá xong.
             */
            setReports((current) => current.filter((r) => r.pet?._id !== petId));
            setTotal((n) => Math.max(0, n - 1));
            onPetDeleted();
          } catch {
            Alert.alert(t('admin.title'), t('admin.loadFailed'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.loading} color={colors.teal} />;
  if (reports.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="flag" size={15} color={colors.danger} />
        <Text style={styles.title}>{t('admin.reports')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{total}</Text>
        </View>
      </View>

      {reports.map((report) => (
        <ReportCard
          key={report._id}
          report={report}
          busy={busyId === report._id}
          onOpen={onOpenPet}
          onDismiss={() => dismiss(report)}
          onDeletePost={() => deletePost(report)}
          lang={lang}
        />
      ))}

      {page < pages && (
        <TouchableOpacity style={styles.more} onPress={loadMore} activeOpacity={0.8}>
          <Text style={styles.moreText}>{t('admin.reportMore')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ReportCard({
  report,
  busy,
  onOpen,
  onDismiss,
  onDeletePost,
  lang,
}: {
  report: AdminReport;
  busy: boolean;
  onOpen: (id: string) => void;
  onDismiss: () => void;
  onDeletePost: () => void;
  lang: 'vi' | 'en';
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const { pet } = report;
  const status = pet ? statusStyle(pet, colors) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.reason}>{t(`report.reason.${report.reason}`)}</Text>
        <Text style={styles.time}>{timeAgo(report.date, t, lang)}</Text>
      </View>

      {/* Người báo cáo không bắt buộc ghi gì, nên phần lớn báo cáo không có */}
      {!!report.note && <Text style={styles.note}>{report.note}</Text>}

      {/*
        pet === null nghĩa là tin đã bị xoá mà báo cáo còn nằm lại. Nói thẳng
        ra, và chỉ còn đúng một việc làm được là bỏ qua báo cáo.
      */}
      {pet ? (
        <TouchableOpacity
          style={styles.petRow}
          onPress={() => onOpen(pet._id)}
          activeOpacity={0.7}
        >
          {pet.image ? (
            <Image source={{ uri: thumbnail(pet.image, THUMB_CARD) }} style={styles.petImage} />
          ) : (
            <View style={[styles.petImage, styles.petImageEmpty]}>
              <Ionicons name="paw" size={18} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.petBody}>
            {status && (
              <View style={[styles.badge, { backgroundColor: status.color }]}>
                <Text style={[styles.badgeText, { color: status.onColor }]}>
                  {t(status.labelKey)}
                </Text>
              </View>
            )}
            <Text style={styles.petTitle} numberOfLines={1}>
              {pet.breed} · {pet.color}
            </Text>
            <Text style={styles.petArea} numberOfLines={1}>
              {pet.area}
              {pet.postId ? ` · ${pet.postId}` : ''}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.goneRow}>
          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
          <Text style={styles.goneText}>{t('admin.reportPetGone')}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.action, busy && styles.disabled]}
          onPress={onDismiss}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{t('admin.reportDismiss')}</Text>
        </TouchableOpacity>

        {pet && (
          <TouchableOpacity
            style={[styles.action, styles.actionDanger, busy && styles.disabled]}
            onPress={onDeletePost}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionText, styles.actionDangerText]}>
              {t('admin.reportDeletePost')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    loading: { marginVertical: spacing.lg },
    wrap: { marginBottom: spacing.xl },

    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    title: { fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
    countBadge: {
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.full,
      backgroundColor: colors.danger,
      alignItems: 'center',
    },
    countText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

    card: {
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      // Viền đỏ nhạt: nhìn lướt là tách hẳn khỏi danh sách tin bên dưới
      borderColor: colors.warnBorder,
      backgroundColor: colors.warnBg,
      marginBottom: spacing.md,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reason: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.warnText },
    time: { fontSize: 11, color: colors.textMuted },

    note: { fontSize: 12.5, color: colors.text, lineHeight: 18, marginTop: spacing.sm },

    petRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 60,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      marginTop: spacing.md,
    },
    petImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceTint },
    petImageEmpty: { alignItems: 'center', justifyContent: 'center' },
    petBody: { flex: 1, gap: 2 },

    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.full,
    },
    badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

    petTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    petArea: { fontSize: 11.5, color: colors.textMuted },

    goneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    goneText: { fontSize: 12.5, color: colors.textMuted, fontStyle: 'italic' },

    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    action: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    actionDanger: { borderColor: colors.danger },
    actionText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
    actionDangerText: { color: colors.danger },
    disabled: { opacity: 0.45 },

    more: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    moreText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  }),
);
