import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L, {
  addTiles, pinIcon, colorForPet, clusterByScreen, clusterIcon, meIcon,
  distanceKm, AREA_RADIUS_M, DEFAULT_CENTER, DEFAULT_ZOOM, NEAR_ZOOM, RADIUS_CHOICES_KM,
  ME_KEY, readSavedMe,
} from '../map';
import { useI18n } from '../i18n';

// Dưới mức này, vòng tròn 500m nhỏ hơn một pixel nên chỉ làm bẩn màn hình.
const CIRCLE_FROM_ZOOM = 13;

// Mức thu nhỏ dùng để dò xem tin đang tụ ở đâu, khi chưa biết người dùng ở đâu.
const DENSITY_ZOOM = 10;

/*
 * Bản đồ tin, dùng cho cả trang chủ lẫn trang chi tiết.
 *
 * ------------------------------------------------------------------
 * Vì sao file này đầy useRef chứ không phải useState
 *
 * Leaflet là thư viện điều khiển bằng LỆNH: nó tự giữ cây DOM của nó và mình
 * ra lệnh thêm bớt lớp. React thì ngược lại, vẽ lại từ state. Hai lối này đụng
 * nhau nếu để React quản đối tượng bản đồ.
 *
 * Nên đối tượng Leaflet nằm trong ref: đổi chúng KHÔNG kéo theo một lần vẽ
 * lại, mà vẽ lại cũng không dựng lại bản đồ. Chỉ những thứ thật sự hiện ra
 * trong JSX — đang định vị, bán kính, câu lỗi — mới là state.
 *
 * Dựng bản đồ hai lần là một lỗi thật, không phải lo xa: React 19 chạy effect
 * HAI LẦN ở chế độ phát triển để lộ ra chỗ dọn dẹp thiếu. Thiếu map.remove()
 * trong phần dọn là hai bản đồ chồng lên nhau, bản dưới vẫn nghe sự kiện.
 */
export default function PetMap({
  pets = [],
  height = 'h-[28rem]',
  // Bật nút "gần tôi" và gom nhóm. Trang chi tiết tin để nguyên mặc định.
  controls = false,
  // Số tin khớp bộ lọc nhưng không ghim vị trí. Server đếm giúp vì nó đã lọc
  // bỏ những tin đó trước khi gửi về, ở đây không tự suy ra được.
  unlocatedCount = null,
  capped = false,
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const divRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const meLayerRef = useRef(null);

  const [me, setMe] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const located = useMemo(
    () => pets.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [pets],
  );

  const unlocated = unlocatedCount !== null ? unlocatedCount : pets.length - located.length;

  const nearby = useMemo(() => {
    if (!me) return [];
    return located.filter((p) => distanceKm(me[0], me[1], p.lat, p.lng) <= radiusKm);
  }, [me, located, radiusKm]);

  const summary = me
    ? t('map.nearbyCount', { n: nearby.length, km: radiusKm })
    : t('map.locatedCount', { n: located.length });

  /*
   * Popup của Leaflet nhận HTML thuần, không dùng được JSX.
   *
   * Nên mọi giá trị nhét vào đây đều phải thoát ký tự bằng tay. Tên con vật
   * và khu vực là chữ NGƯỜI DÙNG tự gõ: bỏ qua bước này là ai đó đặt tên chó
   * thành một thẻ script rồi nó chạy trong trình duyệt của người khác.
   */
  const popupHtml = useCallback(
    (pet) => {
      const esc = (s) =>
        String(s || '').replace(/[&<>"]/g, (c) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

      const img = pet.image
        ? `<img src="${esc(pet.image)}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>`
        : '';
      const away = me
        ? `<div style="font-size:11px;color:#3b82f6;font-weight:600;margin-bottom:4px">${
            distanceKm(me[0], me[1], pet.lat, pet.lng).toFixed(1)} km</div>`
        : '';

      return `
        <div style="min-width:150px">
          ${img}
          <div style="font-weight:700;color:#111827">${esc(pet.name || pet.breed)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">${esc(pet.color)} · ${esc(pet.area)}</div>
          ${away}
          <button id="go-${pet._id}" style="
            width:100%;background:#f97316;color:#fff;border:0;border-radius:8px;
            padding:5px 0;font-size:12px;font-weight:600;cursor:pointer">
            ${esc(t('map.viewPost'))}
          </button>
        </div>`;
    },
    [me, t],
  );

  const drawPet = useCallback(
    (pet, withArea) => {
      const color = colorForPet(pet);
      if (withArea) {
        // Toạ độ đã được làm mờ về lưới ~500m, nên vẽ vùng mới đúng với độ
        // chính xác mình thật sự có. Một chấm nhỏ ngụ ý chính xác hơn sự thật.
        L.circle([pet.lat, pet.lng], {
          radius: AREA_RADIUS_M,
          color, weight: 1, opacity: 0.5,
          fillColor: color, fillOpacity: 0.12,
        }).addTo(layerRef.current);
      }
      L.marker([pet.lat, pet.lng], { icon: pinIcon(color) })
        .addTo(layerRef.current)
        .bindPopup(popupHtml(pet))
        .on('popupopen', () => {
          const el = document.getElementById(`go-${pet._id}`);
          if (el) el.onclick = () => navigate(`/pet/${pet._id}`);
        });
    },
    [popupHtml, navigate],
  );

  const draw = useCallback(() => {
    const map = mapRef.current;
    if (!map || !layerRef.current) return;

    layerRef.current.clearLayers();
    if (located.length === 0) return;

    if (!controls) {
      located.forEach((pet) => drawPet(pet, true));
      // Một tin, hoặc vài tin của cùng một trang — ôm hết là đúng ở đây.
      map.fitBounds(L.latLngBounds(located.map((p) => [p.lat, p.lng])), {
        padding: [40, 40],
        maxZoom: 14,
      });
      return;
    }

    const zoom = map.getZoom();
    clusterByScreen(map, located, zoom).forEach((group) => {
      if (group.members.length === 1) {
        drawPet(group.members[0], zoom >= CIRCLE_FROM_ZOOM);
        return;
      }
      L.marker([group.lat, group.lng], { icon: clusterIcon(group.members) })
        .addTo(layerRef.current)
        // Bấm vào chấm gộp thì phóng vừa đủ để tách chùm đó ra, chứ không
        // nhảy một mạch tới mức tối đa rồi người dùng mất phương hướng.
        .on('click', () => {
          map.fitBounds(L.latLngBounds(group.members.map((p) => [p.lat, p.lng])), {
            padding: [60, 60],
            maxZoom: zoom + 3,
          });
        });
    });
  }, [located, controls, drawPet]);

  const drawMe = useCallback(() => {
    if (!meLayerRef.current) return;
    meLayerRef.current.clearLayers();
    if (!me) return;

    L.circle(me, {
      radius: radiusKm * 1000,
      color: '#3b82f6', weight: 1, opacity: 0.4,
      fillColor: '#3b82f6', fillOpacity: 0.05,
    }).addTo(meLayerRef.current);
    L.marker(me, { icon: meIcon(), interactive: false }).addTo(meLayerRef.current);
  }, [me, radiusKm]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t('map.noGeolocation'));
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = [pos.coords.latitude, pos.coords.longitude];
        setMe(here);
        if (mapRef.current) mapRef.current.setView(here, NEAR_ZOOM);
        // Nhớ lại để lần sau bản đồ mở ra đúng chỗ ngay, khỏi chờ định vị.
        // Chỉ nằm trong trình duyệt của chính người đó, không gửi lên server.
        try { localStorage.setItem(ME_KEY, JSON.stringify(here)); } catch { /* chế độ ẩn danh */ }
      },
      () => {
        setLocating(false);
        setGeoError(t('map.denied'));
      },
      { timeout: 10000 },
    );
  }, [t]);

  /*
   * Giữ bản mới nhất của draw và locateMe trong ref.
   *
   * Người nghe 'zoomend' chỉ gắn MỘT lần lúc dựng bản đồ. Gắn thẳng hàm draw
   * vào đó thì nó đóng băng bản draw của lần vẽ ấy, và mãi về sau vẫn gom
   * nhóm theo danh sách tin cũ. Gắn lại mỗi lần draw đổi thì phải gỡ ra gắn
   * vào liên tục, dễ sót một lần gỡ rồi chồng người nghe.
   */
  const drawRef = useRef(draw);
  const locateRef = useRef(locateMe);
  useEffect(() => { drawRef.current = draw; }, [draw]);
  useEffect(() => { locateRef.current = locateMe; }, [locateMe]);

  // Dựng bản đồ. Chạy đúng một lần — danh sách phụ thuộc rỗng là cố ý, mọi
  // thứ đổi về sau đều đi qua mấy effect ở dưới.
  useEffect(() => {
    const map = L.map(divRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    addTiles(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    meLayerRef.current = L.layerGroup().addTo(map);

    if (controls) {
      // Nhóm được gom theo khoảng cách trên màn hình, nên đổi mức thu phóng
      // là phải gom lại từ đầu.
      map.on('zoomend', () => drawRef.current());

      /*
       * Bản đồ mở ra ở đâu là quyết định quan trọng nhất của cả tính năng này.
       *
       * Ôm hết mọi tin thì khi tin trải từ Cần Thơ tới Hà Nội, màn hình thu về
       * mức cả nước và không nói được gì — càng nhiều tin càng vô dụng. Nên:
       * chỗ người dùng đang đứng trước, không có thì tới chỗ đang có nhiều tin.
       */
      const saved = readSavedMe();
      if (saved) {
        setMe(saved);
        map.setView(saved, NEAR_ZOOM);
      } else if (located.length > 0) {
        const groups = clusterByScreen(map, located, DENSITY_ZOOM);
        const biggest = groups.reduce((a, b) => (b.members.length > a.members.length ? b : a));
        map.setView([biggest.lat, biggest.lng], DEFAULT_ZOOM);
      }

      // Chỉ tự định vị khi trình duyệt ĐÃ được cho phép từ trước. Tự xin quyền
      // ngay lúc mở bản đồ là ném một hộp thoại vào mặt người mới vào xem.
      if (!saved && navigator.geolocation && navigator.permissions) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') locateRef.current();
          })
          .catch(() => {
            // Trình duyệt không hỗ trợ hỏi quyền thì cứ để người dùng tự bấm.
          });
      }
    }

    drawRef.current();
    // Bản đồ dựng lúc khung chứa nó có thể chưa có kích thước thật; Leaflet đo
    // một lần rồi nhớ, nên phải bảo nó đo lại sau khi trình duyệt vẽ xong.
    const hen = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(hen);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      meLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Thay cho watch: pets() của bản Vue.
  useEffect(() => { draw(); }, [draw]);

  // Thay cho watch: me() và watch: radiusKm().
  useEffect(() => { drawMe(); }, [drawMe]);

  return (
    <div>
      {/*
        Thanh điều khiển chỉ dành cho bản đồ duyệt tin ở trang chủ. Bản đồ một
        tin ở trang chi tiết không cần, nên mặc định tắt.
      */}
      {controls && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locating ? t('map.locating') : t('map.nearMe')}
          </button>

          {me && (
            <select
              id="radiuskm"
              name="radiuskm"
              aria-label={t('map.radius')}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 bg-white focus:outline-none focus:border-orange-300"
            >
              {RADIUS_CHOICES_KM.map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          )}

          <span className="text-xs text-gray-500 ml-auto">{summary}</span>
        </div>
      )}

      <div ref={divRef} className={`${height} w-full rounded-2xl border border-gray-100 overflow-hidden z-0`} />

      {geoError && <p className="text-xs text-rose-500 mt-1.5">{geoError}</p>}
      {capped && <p className="text-xs text-amber-600 mt-1.5">{t('map.capped')}</p>}
      {unlocated > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {unlocated} {t('map.withoutCoords')}
        </p>
      )}
    </div>
  );
}
