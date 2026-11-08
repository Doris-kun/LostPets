import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { errorStatus } from '../api';
import type { MatchResult, Pet, ReportReason, RootStackParamList } from '../types';
import claim from '../claim';
import ClaimCodeModal from '../components/ClaimCodeModal';
import ReportModal from '../components/ReportModal';
import report from '../report';
import PetMap, { DirectionsButton } from '../components/PetMap';
import { WEB_URL } from '../config';
import { hasPoint } from '../map';
import { useLanguage } from '../context/language';
import { statusStyle } from '../theme';
import { useTheme } from '../context/theme';

/*
 * Màn hình chi tiết một tin.
 *
 * Chứa chữ D (Delete) của CRUD, và nút Sửa dẫn sang màn form.
 * Tương đương pages/PetDetail.jsx bên web, bỏ phần chia sẻ và đánh dấu đoàn tụ.
 */

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

/** Hành động đang chờ người dùng nhập mã xác nhận. null = không chờ gì. */
type AskCode = 'delete' | 'resolve' | 'edit' | null;

export default function DetailScreen({ route, navigation }: Props) {
  // Tham số truyền từ màn trước: navigation.navigate('Detail', { id: ... })
  // Tương đương useParams() của react-router bên web.
  const { id } = route.params;
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // Đang gửi yêu cầu đánh dấu đoàn tụ -> khoá nút, đổi chữ thành "Đang lưu..."
  const [resolving, setResolving] = useState(false);

  // Phần AI đối chiếu: đang chạy, kết quả, lỗi
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState('');

  // Đang xin mã cho việc gì: 'delete', 'resolve', hoặc null khi không hỏi
  const [askCode, setAskCode] = useState<AskCode>(null);
  const [codeError, setCodeError] = useState('');
  // Đang kiểm tra quyền sửa, khoá nút để tránh bấm hai lần
  const [checkingEdit, setCheckingEdit] = useState(false);

  /*
   * Phần báo cáo tin.
   *
   * `reported` đọc từ bộ nhớ máy chứ không hỏi máy chủ: máy chủ CỐ Ý không
   * cho biết tin nào đã bị ai báo cáo — xem ghi chú trong reportController.js.
   * Nên đây chỉ là trí nhớ của riêng máy này, và cũng chỉ cần tới vậy: mục
   * đích là đừng cho bấm đi bấm lại, không phải để thống kê.
   */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStage, setReportStage] = useState<'form' | 'thanks'>('form');
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let ignore = false;
    report.has(id).then((da) => {
      if (!ignore) setReported(da);
    });
    return () => {
      ignore = true;
    };
  }, [id]);

  const guiBaoCao = async (reason: ReportReason, note: string) => {
    setReportSending(true);
    setReportError('');
    try {
      await api.reportPet(id, { reason, note });
      await report.mark(id);
      setReported(true);
      setReportStage('thanks');
    } catch (err) {
      // 429 là bị chặn vì gửi quá nhiều, nói rõ ra thay vì gộp vào câu chung
      // — người dùng cần biết là chờ được chứ không phải hỏng vĩnh viễn.
      setReportError(t(errorStatus(err) === 429 ? 'report.tooMany' : 'report.failed'));
    } finally {
      setReportSending(false);
    }
  };

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
  const doResolve = async (code?: string) => {
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
      if (errorStatus(err) === 403) return false;

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
      const status = errorStatus(err);
      // ?? 0 vi status la undefined khi khong goi toi duoc may chu.
      setMatchError(t([429, 504].includes(status ?? 0) ? 'match.busy' : 'match.error'));
    } finally {
      setMatchLoading(false);
    }
  };

  const handleShare = async () => {
    /*
     * Chan ngay tu dau cho TypeScript yen tam. Thuc te nut Chia se chi ve ra
     * khi da tai xong tin, nhung TypeScript khong suy ra duoc dieu do tu cho
     * khac trong file - ma viet ra mot dong nhu vay cung chang mat gi.
     */
    if (!pet) return;

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
  const canEdit = async (code?: string) => {
    try {
      const useCode = code ?? (await claim.get(id));
      await api.updatePet(id, {}, useCode);
      if (code) await claim.save(id, code);
      return true;
    } catch (err) {
      if (errorStatus(err) === 403) return false;
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
      /*
       * Xin lai that bai thi dung ban dang co san - van sua duoc, chi la
       * thieu dac diem bi mat.
       *
       * Nhung phai co ban do da: man sua BAT BUOC phai nhan mot tin. Truoc
       * day cho nay truyen thang pet vao, ma pet co the la null - luc do man
       * sua se do route.params.pet.type cua mot gia tri null va app sap.
       * Khong ai gap vi phai dung luc mang hong thi moi vao duoc nhanh nay.
       */
      if (pet) navigation.navigate('Form', { mode: 'edit', pet });
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

  const doDelete = async (code?: string) => {
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
      if (errorStatus(err) === 403) return false;

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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-[15px] text-text-muted">{t('detail.notFound')}</Text>
      </View>
    );
  }

  const status = statusStyle(pet, colors);

  return (
    <ScrollView
      className="flex-1 bg-background"
      /* pb-12 = 48px = spacing.xl * 2, chừa chỗ cho thanh điều hướng dưới */
      contentContainerClassName="p-lg pb-12"
    >
      {pet.image ? (
        <Image source={{ uri: pet.image }} className="h-[220px] w-full rounded-lg bg-surface" />
      ) : (
        <View className="h-[220px] w-full rounded-lg bg-surface items-center justify-center">
          {/* Ionicons không phải thẻ của React Native nên NativeWind không
              gắn className vào được — phải để style như cũ. */}
          <Ionicons name="paw" size={56} color={colors.textMuted} style={{ opacity: 0.4 }} />
        </View>
      )}

      <View className="mt-lg flex-row items-center justify-between">
        {/* Màu nhãn chạy theo trạng thái tin nên phải ở style */}
        <View className="rounded-full px-3 py-[5px]" style={{ backgroundColor: status.color }}>
          <Text className="text-[12px] font-bold" style={{ color: status.onColor }}>
            {t(status.labelKey)}
          </Text>
        </View>
        {/*
          Mã tin cố ý KHÔNG hiện ở đây. Trang này dành cho người đang đi tìm
          con vật, không phải cho việc tra cứu nội bộ. Chủ tin xem mã ở "Bài
          của tôi", quản trị viên xem ở trang quản trị.

          Mã vẫn sinh ra và vẫn nằm trong dữ liệu, nên gõ mã vào ô tìm kiếm
          vẫn ra đúng tin — nhánh khớp nguyên văn trong searchByMeaning luôn
          đứng trên mọi kết quả ngữ nghĩa.
        */}
      </View>

      {/* Tin đã đoàn tụ: báo rõ bằng một dải màu, không chỉ ẩn nút đi */}
      {pet.resolved && (
        <View className="mt-md flex-row items-center gap-sm rounded-md border border-sky bg-surface-tint px-md py-[11px]">
          <Ionicons name="checkmark-circle" size={17} color={colors.resolved} />
          <Text className="flex-1 text-[13px] font-bold text-resolved">
            {t('detail.resolvedBanner')}
          </Text>
        </View>
      )}

      <Text className="mt-md text-[24px] font-bold text-text">{pet.name || pet.breed}</Text>
      <Text className="mt-0.5 text-[14px] text-text-muted">
        {pet.species} · {pet.breed}
      </Text>

      <View className="mt-lg flex-row gap-md">
        <InfoBox label={t('detail.color')} value={pet.color} />
        <InfoBox label={t('detail.area')} value={pet.area} />
      </View>

      {/*
       * Bản đồ chỉ hiện khi tin có toạ độ. Tin cũ và tin đăng từ web mà người
       * ta bỏ qua bước chọn điểm thì không có — lúc đó không chừa chỗ trống.
       */}
      {hasPoint(pet) && (
        <View className="mt-lg">
          <Text className="text-[11px] font-bold tracking-[0.5px] text-text-muted">{t('map.where')}</Text>

          {/*
           * Bản đồ tĩnh, chạm vào mở ra toàn màn hình (expandable).
           *
           * Màn này cuộn được, nên không để bản đồ bắt cử chỉ kéo — xem phần
           * giải thích CHUYỆN CỬ CHỈ trong components/PetMap.js.
           */}
          {/* PetMap nhận prop style chứ không nhận className — nó là thẻ của
              dự án, không phải thẻ của React Native. */}
          <PetMap
            pets={[pet]}
            interactive={false}
            expandable
            height={170}
            style={{ marginTop: 6 }}
          />

          {/*
           * Nói rõ đây là vùng gần đúng, không phải địa chỉ. Quan trọng: người
           * đọc thấy một pin trên bản đồ rất dễ tưởng là đúng nhà, rồi tự đi
           * tới — trong khi toạ độ đã bị làm mờ ~500m và chủ tin cố ý vậy.
           */}
          <Text className="mt-sm text-[11px] leading-4 text-text-muted">
            {t('map.approxNote')}
          </Text>

          <DirectionsButton lat={pet.lat} lng={pet.lng} />
        </View>
      )}

      {!!pet.description && (
        <View className="mt-lg">
          <Text className="text-[11px] font-bold tracking-[0.5px] text-text-muted">{t('detail.desc')}</Text>
          <Text className="mt-1.5 text-[14px] leading-[21px] text-text-soft">
            {pet.description}
          </Text>
        </View>
      )}

      <View className="mt-lg rounded-md border border-contact-border bg-contact-bg p-md">
        <Text className="text-[11px] font-bold tracking-[0.5px] text-teal-text">
          {t('detail.contact')}
        </Text>
        <Text className="mt-1 text-[16px] font-bold text-text">{pet.contact}</Text>
      </View>

      {/* Cảnh báo đặt ngay dưới số liên hệ — đúng lúc người ta sắp bấm gọi */}
      <View className="mt-md flex-row gap-sm rounded-md border border-warn-border bg-warn-bg px-md py-[11px]">
        <Ionicons name="warning" size={15} color={colors.warnText} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12.5px] leading-[18px] text-warn-text">
          {t('scam.warning')}
        </Text>
      </View>

      {/*
        Đặc điểm bí mật. Server chỉ trả trường này về cho CHỦ bài — người đăng
        nhập đúng tài khoản, hoặc máy đang giữ mã xác nhận. Khách xem bài không
        bao giờ nhận được, nên không cần kiểm tra quyền ở đây: không có dữ liệu
        thì ô tự không hiện.
      */}
      {!!pet.secretDetail && (
        <View className="mt-md rounded-md border border-secret-border bg-secret-bg px-md py-3">
          <View className="flex-row items-center gap-[5px]">
            <Ionicons name="lock-closed" size={12} color={colors.secretText} />
            <Text className="text-[11px] font-bold tracking-[0.4px] text-secret-text">
              {t('secret.yours')}
            </Text>
          </View>
          <Text className="mt-1.5 text-[14px] font-semibold text-text">{pet.secretDetail}</Text>
          <Text className="mt-1.5 text-[11.5px] leading-[17px] text-secret-text">
            {t('secret.howToUse')}
          </Text>
        </View>
      )}

      {/*
        Đối chiếu AI — chỉ hiện với bài CHƯA đoàn tụ. Tìm chủ cho con vật đã
        về nhà rồi thì vô nghĩa, bày nút ra chỉ tốn lượt gọi AI.
      */}
      {!pet.resolved && (
        <View className="mt-xl rounded-lg border border-ai-border bg-ai-bg p-lg">
          <Text className="text-[15px] font-extrabold text-ai-text">{t('match.title')}</Text>
          <Text className="mt-1 text-[12px] leading-[18px] text-text-muted">
            {t('match.subtitle')}
          </Text>

          <TouchableOpacity
            className={`mt-md min-h-11 items-center justify-center rounded-md bg-ai-accent py-3 ${
              matchLoading ? 'opacity-50' : ''
            }`}
            onPress={findMatches}
            disabled={matchLoading}
            activeOpacity={0.85}
          >
            {matchLoading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={15} color={colors.onPrimary} />
                <Text className="text-[14px] font-bold text-on-primary">
                  {t('match.action')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {matchLoading && <Text className="mt-sm text-center text-[12px] leading-[18px] text-text-muted">{t('match.wait')}</Text>}
          {!!matchError && (
            <Text className="mt-sm text-center text-[12px] text-danger">{matchError}</Text>
          )}

          {/* Có kết quả rồi: hoặc danh sách bài khớp, hoặc câu "chưa tìm thấy" */}
          {!!matchResult &&
            !matchLoading &&
            (matchResult.matches.length > 0 ? (
              <View className="mt-md gap-sm">
                {matchResult.matches.map((item) => (
                  <TouchableOpacity
                    key={item.pet._id}
                    /*
                      min-h-20 = 80 = ảnh 64 cộng đệm 8 trên 8 dưới, đúng bằng
                      chiều cao hàng vốn tự có. Khai ra để luật 44pt đo được.
                    */
                    className="min-h-20 flex-row rounded-md bg-background p-sm"
                    onPress={() => navigation.push('Detail', { id: item.pet._id })}
                    activeOpacity={0.85}
                  >
                    {!!item.pet.image && (
                      <Image
                        source={{ uri: item.pet.image }}
                        className="h-16 w-16 rounded-sm bg-surface"
                      />
                    )}

                    <View className="ml-md flex-1 justify-center">
                      <View className="self-start rounded-full bg-ai-accent px-2 py-0.5">
                        <Text className="text-[10.5px] font-extrabold text-on-primary">
                          {t('match.score', { n: item.score })}
                        </Text>
                      </View>

                      <Text className="mt-1 text-[14px] font-extrabold text-text" numberOfLines={1}>
                        {item.pet.name || item.pet.breed}
                      </Text>
                      <Text className="mt-0.5 text-[12px] leading-[17px] text-text-soft">
                        {item.reason}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text className="mt-sm text-center text-[12px] leading-[18px] text-text-muted">
                {t('match.none')} {t('match.checked', { n: matchResult.candidatesChecked })}
              </Text>
            ))}
        </View>
      )}

      <TouchableOpacity
        className="mt-xl flex-row items-center justify-center gap-1.5 rounded-md border-[1.5px] border-border-strong bg-surface py-3.5"
        onPress={handleShare}
        activeOpacity={0.85}
      >
        <Ionicons name="share-social-outline" size={16} color={colors.textSoft} />
        <Text className="text-[14px] font-bold text-text-soft">{t('detail.share')}</Text>
      </TouchableOpacity>

      {/* Chỉ hiện khi tin chưa được đánh dấu — đã đoàn tụ rồi thì không lùi lại */}
      {!pet.resolved && (
        <TouchableOpacity
          className={`mt-md flex-row items-center justify-center gap-1.5 rounded-md border-2 border-resolved py-3.5 ${
            resolving ? 'opacity-50' : ''
          }`}
          onPress={handleResolve}
          disabled={resolving}
          activeOpacity={0.85}
        >
          {/* Lúc đang lưu thì bỏ icon đi, chỉ còn chữ "Đang lưu..." */}
          {!resolving && <Ionicons name="checkmark-circle-outline" size={17} color={colors.resolved} />}
          <Text className="text-[14px] font-bold text-resolved">
            {t(resolving ? 'detail.resolving' : 'detail.resolve')}
          </Text>
        </TouchableOpacity>
      )}

      <View className="mt-md flex-row gap-md">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-md py-3.5 border-2 border-border-strong"
          onPress={handleEdit}
          disabled={checkingEdit}
        >
          <Text className="text-[14px] font-bold text-text-soft">{t('detail.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center justify-center rounded-md py-3.5 bg-danger ${deleting ? 'opacity-50' : ''}`}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text className="text-[14px] font-bold text-on-primary">
            {t(deleting ? 'detail.deleting' : 'detail.delete')}
          </Text>
        </TouchableOpacity>
      </View>
      {/*
        Báo cáo tin — để cuối cùng và làm nhạt, vì tuyệt đại đa số tin là tin
        thật, không nên gợi ý người đọc nghi ngờ ngay từ đầu. Nhưng vẫn phải
        có mặt trên MỌI tin: người bị hại vì một tin giả thường không có tài
        khoản và không đăng gì cả, nên đây là đường duy nhất của họ.
      */}
      <TouchableOpacity
        // Không viền, không nền, chữ mờ, nhưng vẫn cao 48 cho đủ vùng chạm
        className="mt-md min-h-12 flex-row items-center justify-center gap-1.5"
        onPress={() => {
          setReportError('');
          setReportStage('form');
          setReportOpen(true);
        }}
        disabled={reported}
        activeOpacity={0.7}
      >
        <Ionicons
          name={reported ? 'flag' : 'flag-outline'}
          size={15}
          color={colors.textMuted}
        />
        <Text className="text-[12.5px] font-semibold text-text-muted">
          {t(reported ? 'report.already' : 'report.action')}
        </Text>
      </TouchableOpacity>

      <ReportModal
        visible={reportOpen}
        stage={reportStage}
        sending={reportSending}
        error={reportError}
        onSubmit={guiBaoCao}
        onClose={() => setReportOpen(false)}
      />

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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-md bg-surface p-md">
      <Text className="text-[11px] font-bold tracking-[0.5px] text-text-muted">{label}</Text>
      <Text className="mt-1 text-[14px] font-semibold text-text">{value}</Text>
    </View>
  );
}
