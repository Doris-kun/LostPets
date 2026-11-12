import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import type { AdminReport } from '../types';
import { THUMB_CARD, thumbnail } from '../image';
import { timeAgo } from './PetCard';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { statusStyle } from '../theme';

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

  if (loading) return <ActivityIndicator className="my-lg" color={colors.teal} />;
  if (reports.length === 0) return null;

  return (
    <View className="mb-xl">
      <View className="mb-md flex-row items-center gap-sm">
        <Ionicons name="flag" size={15} color={colors.danger} />
        <Text className="text-[13px] font-extrabold tracking-[0.3px] text-text">
          {t('admin.reports')}
        </Text>
        <View className="min-w-[22px] items-center rounded-full bg-danger px-1.5 py-px">
          <Text className="text-[11px] font-extrabold text-white">{total}</Text>
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
        <TouchableOpacity
          className="min-h-11 items-center justify-center"
          onPress={loadMore}
          activeOpacity={0.8}
        >
          <Text className="text-[13px] font-bold text-primary">{t('admin.reportMore')}</Text>
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

  const { pet } = report;
  const status = pet ? statusStyle(pet, colors) : null;

  return (
    /* Viền đỏ nhạt: nhìn lướt là tách hẳn khỏi danh sách tin bên dưới */
    <View className="mb-md rounded-md border-[1.5px] border-warn-border bg-warn-bg p-md">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-[13.5px] font-extrabold text-warn-text">
          {t(`report.reason.${report.reason}`)}
        </Text>
        <Text className="text-[11px] text-text-muted">{timeAgo(report.date, t, lang)}</Text>
      </View>

      {/* Người báo cáo không bắt buộc ghi gì, nên phần lớn báo cáo không có */}
      {!!report.note && (
        <Text className="mt-sm text-[12.5px] leading-[18px] text-text">{report.note}</Text>
      )}

      {/*
        pet === null nghĩa là tin đã bị xoá mà báo cáo còn nằm lại. Nói thẳng
        ra, và chỉ còn đúng một việc làm được là bỏ qua báo cáo.
      */}
      {pet ? (
        <TouchableOpacity
          className="mt-md min-h-[60px] flex-row items-center gap-md rounded-md bg-surface p-sm"
          onPress={() => onOpen(pet._id)}
          activeOpacity={0.7}
        >
          {pet.image ? (
            <Image
              source={{ uri: thumbnail(pet.image, THUMB_CARD) }}
              className="h-11 w-11 rounded-sm bg-surface-tint"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-sm bg-surface-tint">
              <Ionicons name="paw" size={18} color={colors.textMuted} />
            </View>
          )}

          <View className="flex-1 gap-0.5">
            {status && (
              /* Nền nhãn do statusStyle chọn lúc chạy -> phải style={{}} */
              <View
                className="self-start rounded-full px-1.5 py-px"
                style={{ backgroundColor: status.color }}
              >
                <Text
                  className="text-[9px] font-extrabold tracking-[0.3px]"
                  style={{ color: status.onColor }}
                >
                  {t(status.labelKey)}
                </Text>
              </View>
            )}
            <Text className="text-[13px] font-bold text-text" numberOfLines={1}>
              {pet.breed} · {pet.color}
            </Text>
            <Text className="text-[11.5px] text-text-muted" numberOfLines={1}>
              {pet.area}
              {pet.postId ? ` · ${pet.postId}` : ''}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <View className="mt-md flex-row items-center gap-sm">
          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
          <Text className="text-[12.5px] italic text-text-muted">{t('admin.reportPetGone')}</Text>
        </View>
      )}

      <View className="mt-md flex-row gap-sm">
        <TouchableOpacity
          className={`min-h-11 flex-1 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-surface ${
            busy ? 'opacity-45' : ''
          }`}
          onPress={onDismiss}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text className="text-[13px] font-bold text-text-soft">
            {t('admin.reportDismiss')}
          </Text>
        </TouchableOpacity>

        {pet && (
          <TouchableOpacity
            className={`min-h-11 flex-1 items-center justify-center rounded-md border-[1.5px] border-danger bg-surface ${
              busy ? 'opacity-45' : ''
            }`}
            onPress={onDeletePost}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text className="text-[13px] font-bold text-danger">
              {t('admin.reportDeletePost')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
