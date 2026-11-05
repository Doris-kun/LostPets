import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api, { type PetQuery } from '../api';
import type { MapPage, MapPet } from '../types';
import PetMap from './PetMap';
import { THUMB_CARD, thumbnail } from '../image';
import { distanceKm, hasPoint, NEAR_ME_KM, readSavedMe, saveMe, type Point } from '../map';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing, statusStyle } from '../theme';

/*
 * Bản đồ tất cả tin, thay cho danh sách ở Trang chủ.
 *
 * Vì sao bản đồ đáng làm trên điện thoại hơn trên web: người mất thú cưng
 * đang ĐỨNG NGOÀI ĐƯỜNG đi tìm. Câu hỏi của họ là "quanh chỗ tôi đang đứng
 * có tin nào không" — web trả lời được rất kém vì máy tính không mang theo
 * được. Nút "Gần tôi" ở đây chính là chỗ đó.
 *
 * Ba chỗ cố ý làm khác bản web, vì màn hình nhỏ:
 *
 *   1. Bản đồ chiếm TRỌN vùng danh sách, không phải một ô nhỏ trong trang
 *      cuộn. Bản đồ nhỏ nằm giữa trang cuộn thì kéo bản đồ hay kéo trang —
 *      máy không đoán được, người dùng bực.
 *
 *   2. Chạm vào chấm thì THẺ TRƯỢT LÊN TỪ ĐÁY, không dùng popup của Leaflet.
 *      Popup trên màn 5 inch nhỏ tới mức không đọc nổi và nút bên trong thì
 *      không bấm trúng.
 *
 *   3. Chạm bắt trên cả vòng tròn 550m chứ không chỉ cái pin — pin rộng
 *      chừng 14 điểm ảnh, dưới xa mức 44 tối thiểu cho một vùng chạm.
 */

/*
 * Đang tìm kiếm thì tô đậm mấy tin đầu, phần còn lại làm mờ.
 *
 * Năm là con số của GIAO DIỆN, không phải ngưỡng lọc dữ liệu: không tin nào
 * bị bỏ đi, chấm mờ vẫn bấm được và vẫn mở ra được. Chọn 5 vì nhiều hơn thì
 * mấy cái pin to bắt đầu chồng lên nhau trên màn điện thoại, mà ít hơn thì
 * người dùng dễ bỏ sót con vật của mình chỉ vì nó xếp thứ sáu.
 */
const HIGHLIGHT_TOP = 5;

export interface PetMapViewProps {
  /** Bộ lọc và câu tìm kiếm đang áp dụng ở màn ngoài. */
  params: PetQuery;
  onOpenPet: (id: string) => void;
}

export default function PetMapView({ params, onOpenPet }: PetMapViewProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [data, setData] = useState<MapPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  /** Tin đang chọn, hiện ở thẻ dưới đáy. null = chưa chạm vào chấm nào. */
  const [selected, setSelected] = useState<MapPet | null>(null);

  const [me, setMe] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  /*
   * params là một object dựng lại mỗi lần màn ngoài vẽ, nên so sánh bằng
   * tham chiếu sẽ thấy "đổi" liên tục và gọi máy chủ không ngừng. So bằng
   * nội dung đã chuyển thành chuỗi mới đúng là "điều kiện lọc có đổi không".
   */
  const paramsKey = JSON.stringify(params);

  /*
   * Lấy lại vị trí đã lưu từ lần trước, không hỏi GPS.
   *
   * Nhờ vậy mở bản đồ lên là thấy ngay "n tin trong bán kính 2km" mà không
   * phải bấm "Gần tôi" lại mỗi lần. Vị trí cũ vài phút trước vẫn đủ đúng để
   * đếm theo bán kính 2km.
   */
  useEffect(() => {
    let ignore = false;
    readSavedMe().then((saved) => {
      if (!ignore && saved) setMe(saved);
    });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    api
      .petsForMap(JSON.parse(paramsKey) as PetQuery)
      .then(({ data: next }) => {
        if (ignore) return;
        setData(next);
        setFailed(false);
        // Tin đang mở có thể không còn nằm trong kết quả mới. Để nguyên thì
        // thẻ dưới đáy nói về một tin không còn chấm nào trên bản đồ.
        setSelected(null);
      })
      .catch(() => {
        if (ignore) return;
        setData(null);
        setFailed(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [paramsKey]);

  const pets = useMemo(() => data?.pets ?? [], [data]);

  // Back-end trả về đã xếp theo mức khớp khi có câu tìm kiếm, nên "mấy tin
  // khớp nhất" chính là mấy phần tử đầu mảng.
  const searching = !!params.q?.trim();

  /*
   * Đếm số tin quanh chỗ đang đứng.
   *
   * Tính ở máy chứ không hỏi máy chủ: toàn bộ toạ độ đã nằm sẵn trong tay
   * rồi, hỏi thêm một vòng mạng chỉ để lấy một con số là thừa.
   */
  const nearbyCount = useMemo(() => {
    if (!me) return 0;
    return pets.filter((p) => hasPoint(p) && distanceKm(me, { lat: p.lat, lng: p.lng }) <= NEAR_ME_KM)
      .length;
  }, [me, pets]);

  const goToMe = useCallback(async () => {
    setLocating(true);
    setLocationError('');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setLocationError(t('map.denied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const diem = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(diem);
      // Lưu lại để thẻ tin ở Trang chủ hiện được khoảng cách. Trang chủ cố ý
      // KHÔNG tự xin quyền vị trí, nó chỉ đọc thứ đã lưu ở đây.
      saveMe(diem);
    } catch {
      setLocationError(t('map.denied'));
    } finally {
      setLocating(false);
    }
  }, [t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('map.failed')}</Text>
      </View>
    );
  }

  // Không tin nào có toạ độ thì vẽ bản đồ ra cũng chỉ là một tấm bản đồ trống.
  if (pets.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('map.noLocated')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <PetMap
        pets={pets}
        me={me}
        highlightTop={searching ? HIGHLIGHT_TOP : 0}
        onSelectPet={(id) => setSelected(pets.find((p) => p._id === id) ?? null)}
        style={styles.fill}
      />

      {/* Dải số liệu nổi trên bản đồ, không chiếm chỗ của bản đồ */}
      <View style={styles.counts} pointerEvents="none">
        <Text style={styles.countText}>
          {me ? t('map.nearbyCount', { n: nearbyCount, km: NEAR_ME_KM }) : t('map.locatedCount', { n: data?.total ?? 0 })}
        </Text>
        {!!data?.withoutCoords && (
          <Text style={styles.noteText}>{t('map.withoutCoords', { n: data.withoutCoords })}</Text>
        )}
        {/* Nói thẳng là bản đồ đang thiếu tin, thay vì âm thầm vẽ 500 cái
            rồi để người dùng tưởng đó là tất cả. */}
        {!!data?.capped && <Text style={styles.noteText}>{t('map.capped')}</Text>}
        {/*
          Câu giải thích riêng cho bản đồ. Câu của danh sách ("kết quả sắp
          theo mức độ giống") đem sang đây thì vô nghĩa: trên bản đồ mọi chấm
          hiện cùng lúc, không ai thấy cái nào "đứng trên" cái nào.
        */}
        {searching && (
          <Text style={styles.noteText}>
            {t('map.searchHint', { n: Math.min(HIGHLIGHT_TOP, pets.length) })}
          </Text>
        )}
        {!!locationError && <Text style={styles.errorText}>{locationError}</Text>}
      </View>

      {/*
        Giấu "Gần tôi" khi thẻ đang mở — thẻ chiếm hết đáy màn hình, để lại
        thì hai thứ chồng lên nhau. Người đang xem một tin cụ thể cũng không
        cần tìm quanh mình ngay lúc đó; đóng thẻ là nút hiện lại.

        Nút nằm góc dưới PHẢI, đúng chỗ nút "+" của Trang chủ — vì Trang chủ
        giấu nút "+" đi khi đang ở chế độ bản đồ. Mỗi chế độ một hành động
        chính ở cùng một chỗ, ngón cái không phải học lại.
      */}
      {!selected && (
      <TouchableOpacity
        style={styles.nearMe}
        onPress={goToMe}
        disabled={locating}
        activeOpacity={0.85}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons name="navigate" size={16} color={colors.onPrimary} />
        )}
        <Text style={styles.nearMeText}>{t(locating ? 'map.locating' : 'map.nearMe')}</Text>
      </TouchableOpacity>
      )}

      {selected && <SelectedCard pet={selected} onOpen={onOpenPet} onClose={() => setSelected(null)} />}
    </View>
  );
}

/*
 * Thẻ trượt lên khi chạm vào một chấm.
 *
 * Chỉ đủ thông tin để quyết định có mở tin ra không: ảnh, nhãn trạng thái,
 * giống, khu vực. Số điện thoại thì không có ở đây — mà cũng không lấy được,
 * vì /pets/map cố ý không trả về trường contact.
 */
function SelectedCard({
  pet,
  onOpen,
  onClose,
}: {
  pet: MapPet;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const status = statusStyle(pet, colors);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardClose}
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.cardRow}>
        {pet.image ? (
          <Image source={{ uri: thumbnail(pet.image, THUMB_CARD) }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImageEmpty]}>
            <Ionicons name="paw" size={22} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={[styles.badgeText, { color: status.onColor }]}>{t(status.labelKey)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {pet.name || pet.breed}
          </Text>
          <Text style={styles.cardArea} numberOfLines={1}>
            {pet.area}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cardButton} onPress={() => onOpen(pet._id)} activeOpacity={0.85}>
        <Text style={styles.cardButtonText}>{t('map.viewPost')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
    wrap: { flex: 1 },
    fill: { flex: 1 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },

    counts: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      right: spacing.md,
      gap: 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      ...shadow.card,
    },
    countText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
    noteText: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
    errorText: { fontSize: 11.5, color: colors.danger, lineHeight: 16 },

    nearMe: {
      position: 'absolute',
      right: spacing.md,
      bottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 46,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      ...shadow.card,
    },
    nearMeText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },

    card: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadow.card,
    },
    cardClose: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1, padding: 2 },
    cardRow: { flexDirection: 'row', gap: spacing.md },
    cardImage: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceTint },
    cardImageEmpty: { alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, gap: 4, paddingRight: spacing.lg },

    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

    cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
    cardArea: { fontSize: 12.5, color: colors.textMuted },

    cardButton: {
      marginTop: spacing.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    cardButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.onPrimary },
  }),
);
