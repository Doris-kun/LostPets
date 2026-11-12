import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { type PetQuery } from '../api';
import type { MapPage, MapPet } from '../types';
import PetMap from './PetMap';
import { THUMB_CARD, thumbnail } from '../image';
import { distanceKm, hasPoint, locateMe, NEAR_ME_KM, readSavedMe, type Point } from '../map';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { statusStyle } from '../theme';

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
  const { colors, shadow } = useTheme();

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

    // locateMe lo cả xin quyền, lấy toạ độ và lưu lại — xem src/map.ts. Lưu là
    // để Trang chủ hiện được khoảng cách: nó cố ý KHÔNG tự xin quyền, chỉ đọc
    // thứ đã lưu ở đây hoặc do nút "Hiện khoảng cách" bên đó ghi.
    const diem = await locateMe();

    if (diem) setMe(diem);
    else setLocationError(t('map.denied'));

    setLocating(false);
  }, [t]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-md px-xl">
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (failed) {
    return (
      <View className="flex-1 items-center justify-center gap-md px-xl">
        <Text className="text-center text-[13px] leading-[19px] text-text-muted">
          {t('map.failed')}
        </Text>
      </View>
    );
  }

  // Không tin nào có toạ độ thì vẽ bản đồ ra cũng chỉ là một tấm bản đồ trống.
  if (pets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-md px-xl">
        <Ionicons name="location-outline" size={40} color={colors.textMuted} />
        <Text className="text-center text-[13px] leading-[19px] text-text-muted">
          {t('map.noLocated')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <PetMap
        pets={pets}
        me={me}
        highlightTop={searching ? HIGHLIGHT_TOP : 0}
        onSelectPet={(id) => setSelected(pets.find((p) => p._id === id) ?? null)}
        // PetMap nhận style chứ không nhận className: nó là component của
        // mình nhưng prop đã khai kiểu StyleProp<ViewStyle> từ trước.
        style={{ flex: 1 }}
      />

      {/* Dải số liệu nổi trên bản đồ, không chiếm chỗ của bản đồ */}
      <View
        className="absolute left-md right-md top-md gap-0.5 rounded-md bg-surface px-md py-sm"
        style={shadow.card}
        pointerEvents="none"
      >
        <Text className="text-[12.5px] font-bold text-text">
          {me ? t('map.nearbyCount', { n: nearbyCount, km: NEAR_ME_KM }) : t('map.locatedCount', { n: data?.total ?? 0 })}
        </Text>
        {!!data?.withoutCoords && (
          <Text className="text-[11.5px] leading-4 text-text-muted">
            {t('map.withoutCoords', { n: data.withoutCoords })}
          </Text>
        )}
        {/* Nói thẳng là bản đồ đang thiếu tin, thay vì âm thầm vẽ 500 cái
            rồi để người dùng tưởng đó là tất cả. */}
        {!!data?.capped && (
          <Text className="text-[11.5px] leading-4 text-text-muted">{t('map.capped')}</Text>
        )}
        {/*
          Câu giải thích riêng cho bản đồ. Câu của danh sách ("kết quả sắp
          theo mức độ giống") đem sang đây thì vô nghĩa: trên bản đồ mọi chấm
          hiện cùng lúc, không ai thấy cái nào "đứng trên" cái nào.
        */}
        {searching && (
          <Text className="text-[11.5px] leading-4 text-text-muted">
            {t('map.searchHint', { n: Math.min(HIGHLIGHT_TOP, pets.length) })}
          </Text>
        )}
        {!!locationError && (
          <Text className="text-[11.5px] leading-4 text-danger">{locationError}</Text>
        )}
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
        className="absolute bottom-md right-md min-h-12 flex-row items-center justify-center gap-sm rounded-full bg-primary px-lg"
        style={shadow.card}
        onPress={goToMe}
        disabled={locating}
        activeOpacity={0.85}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons name="navigate" size={16} color={colors.onPrimary} />
        )}
        <Text className="text-[13px] font-bold text-on-primary">
          {t(locating ? 'map.locating' : 'map.nearMe')}
        </Text>
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
  const { colors, shadow } = useTheme();
  const status = statusStyle(pet, colors);

  return (
    <View
      className="absolute bottom-md left-md right-md rounded-lg bg-surface p-md"
      style={shadow.card}
    >
      <TouchableOpacity
        className="absolute right-sm top-sm z-10 p-0.5"
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View className="flex-row gap-md">
        {pet.image ? (
          <Image
            source={{ uri: thumbnail(pet.image, THUMB_CARD) }}
            className="h-16 w-16 rounded-md bg-surface-tint"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-md bg-surface-tint">
            <Ionicons name="paw" size={22} color={colors.textMuted} />
          </View>
        )}

        <View className="flex-1 gap-1 pr-lg">
          {/* Nền nhãn do statusStyle chọn lúc chạy -> phải style={{}} */}
          <View
            className="self-start rounded-full px-sm py-0.5"
            style={{ backgroundColor: status.color }}
          >
            <Text
              className="text-[10px] font-extrabold tracking-[0.3px]"
              style={{ color: status.onColor }}
            >
              {t(status.labelKey)}
            </Text>
          </View>
          <Text className="text-[14.5px] font-extrabold text-text" numberOfLines={1}>
            {pet.name || pet.breed}
          </Text>
          <Text className="text-[12.5px] text-text-muted" numberOfLines={1}>
            {pet.area}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="mt-md min-h-11 items-center justify-center rounded-md bg-primary"
        onPress={() => onOpen(pet._id)}
        activeOpacity={0.85}
      >
        <Text className="text-[13.5px] font-bold text-on-primary">{t('map.viewPost')}</Text>
      </TouchableOpacity>
    </View>
  );
}
