import { useCallback, useEffect, useRef, useState } from 'react';
import L, { addTiles, pinIcon, DEFAULT_CENTER, DEFAULT_ZOOM } from '../map';
import { useI18n } from '../i18n';

// Mức phóng khi đã có điểm: đủ gần để thấy con hẻm, chưa gần tới mức mất
// phương hướng vì không còn nhìn ra đường lớn nào quanh đó.
const ZOOM_CO_DIEM = 16;

/*
 * Ô chọn vị trí trên bản đồ, dùng trong form đăng tin và sửa tin.
 *
 * Cùng lối với PetMap: đối tượng Leaflet nằm trong ref chứ không trong state
 * — xem ghi chú dài ở đầu PetMap.jsx. Khác một điểm quan trọng là component
 * này KHÔNG tự giữ toạ độ: lat/lng đến từ form bên ngoài, và mỗi lần người
 * dùng chọn chỗ mới thì nó báo ngược ra qua onChange.
 *
 * Để form giữ toạ độ chứ không phải bản đồ, vì toạ độ là một trường của tin
 * — nó phải nằm cùng chỗ với tên, giống, màu lông. Bản đồ chỉ là một cách
 * nhập liệu.
 */
export default function MapPicker({ lat = null, lng = null, onChange }) {
  const { t } = useI18n();

  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  // Làm tròn 6 chữ số, đủ chính xác tới khoảng 10cm, khỏi lưu số dài vô ích.
  const bao = useCallback(
    (la, ln) => {
      setError('');
      onChange({ lat: Number(la.toFixed(6)), lng: Number(ln.toFixed(6)) });
    },
    [onChange],
  );

  const veGhim = useCallback(
    (la, ln) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([la, ln]);
        return;
      }
      markerRef.current = L.marker([la, ln], { icon: pinIcon(), draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        baoRef.current(p.lat, p.lng);
      });
    },
    [],
  );

  /*
   * Giữ bản mới nhất của bao() trong ref.
   *
   * Người nghe 'click' của bản đồ và 'dragend' của ghim chỉ gắn MỘT lần.
   * Gắn thẳng hàm vào thì nó đóng băng bản onChange của lần vẽ ấy — form đổi
   * state xong, kéo ghim là ghi đè lại bằng dữ liệu cũ của form.
   */
  const baoRef = useRef(bao);
  useEffect(() => { baoRef.current = bao; }, [bao]);

  const veGhimRef = useRef(veGhim);
  useEffect(() => { veGhimRef.current = veGhim; }, [veGhim]);

  // Dựng bản đồ một lần.
  useEffect(() => {
    const coDiem = Number.isFinite(lat) && Number.isFinite(lng);
    const map = L.map(divRef.current).setView(
      coDiem ? [lat, lng] : DEFAULT_CENTER,
      coDiem ? ZOOM_CO_DIEM : DEFAULT_ZOOM,
    );
    addTiles(map);
    mapRef.current = map;

    map.on('click', (e) => {
      veGhimRef.current(e.latlng.lat, e.latlng.lng);
      baoRef.current(e.latlng.lat, e.latlng.lng);
    });

    if (coDiem) veGhimRef.current(lat, lng);

    // Bản đồ nằm trong form có thể được dựng lúc khung chưa có kích thước thật.
    const hen = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(hen);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Dữ liệu từ ngoài đổ vào sau, ví dụ form sửa tin tải xong mới có toạ độ.
   * Thay cho watch: lat() và watch: lng() của bản Vue.
   */
  useEffect(() => {
    if (!mapRef.current) return;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      veGhim(lat, lng);
      mapRef.current.setView([lat, lng], ZOOM_CO_DIEM);
    } else if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [lat, lng, veGhim]);

  const xoaDiem = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onChange({ lat: null, lng: null });
  };

  const dungViTriCuaToi = () => {
    if (!navigator.geolocation) {
      setError(t('map.noGeolocation'));
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], ZOOM_CO_DIEM);
        veGhim(latitude, longitude);
        bao(latitude, longitude);
      },
      () => {
        setLocating(false);
        setError(t('map.denied'));
      },
      // enableHighAccuracy ở đây chứ không ở PetMap: người đăng tin đang ghim
      // đúng chỗ con vật đi lạc, sai vài trăm mét là người khác tìm nhầm khu.
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      <div ref={divRef} className="h-56 w-full rounded-xl border border-gray-200 overflow-hidden z-0" />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          type="button"
          onClick={dungViTriCuaToi}
          disabled={locating}
          className="inline-flex items-center gap-1.5 border border-gray-400 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locating ? t('map.locating') : t('map.useMyLocation')}
        </button>

        {hasPoint && (
          <button
            type="button"
            onClick={xoaDiem}
            className="text-xs font-semibold text-gray-500 hover:text-danger px-2 py-1.5 transition-colors"
          >
            {t('map.clear')}
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          {hasPoint ? t('map.picked') : t('map.tapToPick')}
        </span>
      </div>

      <p className="text-xs text-danger-dark mt-2 leading-relaxed">{t('map.privacyNote')}</p>
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
