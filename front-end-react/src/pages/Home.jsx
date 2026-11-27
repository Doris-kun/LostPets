import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import PetMap from '../components/PetMap.jsx';
import PetPhoto from '../components/PetPhoto.jsx';
import { readSavedMe, saveMe, distanceKm, formatDistanceKm } from '../map';
import { useI18n } from '../i18n';

const LIMIT = 9;

const TYPE_TABS = [
  { value: '', labelKey: 'filter.all', activeClass: 'bg-gray-900 text-white' },
  { value: 'lost', labelKey: 'filter.lost', activeClass: 'bg-lost text-on-brand' },
  { value: 'found', labelKey: 'filter.found', activeClass: 'bg-found text-on-brand' },
];
const SPECIES_TABS = [
  { value: '', labelKey: 'filter.allSpecies' },
  { value: 'Chó', labelKey: 'filter.dog' },
  { value: 'Mèo', labelKey: 'filter.cat' },
];
const DAYS_TABS = [
  { value: '', labelKey: 'filter.days.all' },
  { value: '7', labelKey: 'filter.days.7' },
  { value: '30', labelKey: 'filter.days.30' },
];

/*
 * Nền VÀ chữ của nhãn trạng thái, trả về cùng một chuỗi.
 *
 * Gộp hai thứ làm một là cố ý: chữ trắng trên nền cam chỉ được 2.46:1, trên
 * nền xanh ngọc 3.03:1 — dưới xa ngưỡng 4.5:1. Tách ra hai chỗ thì sớm muộn
 * có người đổi nền mà quên đổi chữ.
 *
 *   Bị mất      cam   + chữ mực đậm   6.03:1
 *   Tìm thấy    ngọc  + chữ mực đậm   4.90:1
 *   Đã đoàn tụ  navy  + chữ trắng     7.32:1
 */
const mauNhan = (pet) =>
  pet.resolved
    ? 'bg-primary text-white'
    : pet.type === 'lost'
      ? 'bg-lost text-on-brand'
      : 'bg-found text-on-brand';

const khoaNhan = (pet) =>
  pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found';

export default function Home() {
  const { t, lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  // Loại tin nằm trong đường dẫn chứ không trong state: người dùng chia sẻ
  // link /?type=lost thì người nhận phải thấy đúng bộ lọc đó.
  const type = searchParams.get('type') || '';

  const [species, setSpecies] = useState('');
  const [days, setDays] = useState('');
  const [sort, setSort] = useState('newest');

  /*
   * Ô khu vực và ô tìm kiếm có HAI giá trị, không phải một.
   *
   *   goArea / goQ   chữ đang hiện trong ô, đổi theo từng phím
   *   area / q       chữ đã chốt, dùng để gọi API
   *
   * Gọi API theo từng phím thì mỗi ký tự là một lượt gọi, mà lượt tìm kiếm
   * còn phải nhúng câu hỏi qua Gemini — tức là đốt quota theo từng phím gõ.
   */
  const [goArea, setGoArea] = useState('');
  const [area, setArea] = useState('');
  const [goQ, setGoQ] = useState('');
  const [q, setQ] = useState('');

  // Vị trí người xem, do bản đồ lưu lại sau khi họ bấm "vị trí của tôi".
  // Không có thì thẻ tin không hiện khoảng cách — không tự xin quyền ở trang
  // chủ, vì ném hộp thoại vào mặt người mới vào xem là thô lỗ.
  const [me, setMe] = useState(readSavedMe);
  const [locating, setLocating] = useState(false);

  const [view, setView] = useState('list');

  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mapPets, setMapPets] = useState([]);
  const [mapWithoutCoords, setMapWithoutCoords] = useState(0);
  const [mapCapped, setMapCapped] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  /*
   * Hoãn 400ms cho ô khu vực, 500ms cho ô tìm kiếm.
   *
   * Tìm kiếm chờ lâu hơn vì mỗi lượt tốn quota Gemini — gõ xong cả câu rồi
   * mới gửi. Dọn hẹn giờ trong phần trả về: rời trang giữa chừng thì hẹn giờ
   * vẫn nổ và gọi API trên một màn hình không còn ai xem.
   */
  useEffect(() => {
    const hen = setTimeout(() => setArea(goArea), 400);
    return () => clearTimeout(hen);
  }, [goArea]);

  useEffect(() => {
    const hen = setTimeout(() => setQ(goQ), 500);
    return () => clearTimeout(hen);
  }, [goQ]);

  const buildParams = useCallback(
    (tu = 0) => {
      const p = { skip: tu, limit: LIMIT, sort };
      if (type) p.type = type;
      if (species) p.species = species;
      if (area) p.area = area;
      if (days) p.days = days;
      if (q.trim()) p.q = q.trim();
      return p;
    },
    [sort, type, species, area, days, q],
  );

  /*
   * Gọi lại dữ liệu mỗi khi một bộ lọc đã chốt thay đổi.
   *
   * Bản Vue gọi refresh() thẳng trong từng hàm setSpecies, setDays... Ở React
   * làm vậy là đọc phải state CŨ: setSpecies() chưa kịp có hiệu lực thì
   * refresh() đã chạy, và nó gửi đi bộ lọc của lần trước.
   *
   * Nên để một effect theo dõi buildParams — hàm đó đổi khi và chỉ khi có một
   * bộ lọc đổi. Một nguồn sự thật, không có đường nào quên gọi.
   */
  useEffect(() => {
    let bo = false;

    const chay = async () => {
      if (view === 'map') {
        /*
         * Bản đồ dùng endpoint riêng: nó cần mọi tin khớp bộ lọc cùng lúc,
         * trong khi GET /pets chặn cứng ở 50 tin mỗi trang. Gọi /pets kèm
         * limit cao hơn thì server vẫn cắt về 50 và bản đồ âm thầm giấu tin.
         */
        setMapLoading(true);
        try {
          const { data } = await api.getMapPets(buildParams(0));
          if (bo) return;
          setMapPets(data.pets);
          setMapWithoutCoords(data.withoutCoords || 0);
          setMapCapped(!!data.capped);
        } catch {
          if (bo) return;
          setMapPets([]);
          setMapWithoutCoords(0);
          setMapCapped(false);
        } finally {
          if (!bo) setMapLoading(false);
        }
        return;
      }

      setLoading(true);
      setSkip(0);
      try {
        const { data } = await api.getPets(buildParams(0));
        if (bo) return;
        setPets(data.pets);
        setTotal(data.total);
      } catch {
        if (bo) return;
        setPets([]);
        setTotal(0);
      } finally {
        if (!bo) setLoading(false);
      }
    };

    chay();
    return () => { bo = true; };
  }, [buildParams, view]);

  /*
   * Đã từng cho phép định vị thì lấy luôn, không hỏi lại, không bắt bấm.
   *
   * Chỉ chạy khi trình duyệt báo quyền đã ở trạng thái granted — tự gọi
   * getCurrentPosition mà chưa được phép sẽ bật hộp thoại xin quyền ngay lúc
   * người ta vừa mở trang, đúng thứ trang chính sách cam kết không làm.
   */
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = [pos.coords.latitude, pos.coords.longitude];
        setMe(point);
        saveMe(point);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (me || !navigator.geolocation || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') locateMe();
      })
      .catch(() => {
        /* trình duyệt không hỗ trợ hỏi trạng thái quyền: chờ người bấm */
      });
    // Chạy một lần lúc mở trang. Để me vào đây thì mỗi lần định vị xong lại
    // chạy lại, mà lúc đó điều kiện đầu hàm đã chặn rồi — thừa mà rối.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    const tu = skip + LIMIT;
    try {
      const { data } = await api.getPets(buildParams(tu));
      setPets((cu) => [...cu, ...data.pets]);
      setTotal(data.total);
      setSkip(tu);
    } catch {
      /* giữ nguyên skip: lần bấm sau thử lại đúng trang đó */
    } finally {
      setLoadingMore(false);
    }
  };

  const doiLoai = (giaTri) => {
    setSearchParams(giaTri ? { type: giaTri } : {}, { replace: true });
  };

  const xoaTimKiem = () => {
    setGoQ('');
    setQ('');
  };

  /*
   * Khoảng cách từ chỗ người xem tới nơi mất, dạng chữ đã làm tròn. Trả về
   * chuỗi rỗng khi chưa biết vị trí người xem hoặc tin không có toạ độ.
   *
   * Con số cố ý kèm dấu ngã: toạ độ đã bị làm tròn về lưới 500m lúc lưu, nên
   * in "2,34 km" là nói quá độ chính xác mình thực sự có.
   */
  const khoangCach = (pet) => {
    if (!me || !Number.isFinite(pet.lat) || !Number.isFinite(pet.lng)) return '';
    return formatDistanceKm(distanceKm(me[0], me[1], pet.lat, pet.lng));
  };

  const thoiGian = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (lang === 'vi') {
      if (m < 1) return 'Vừa xong';
      if (m < 60) return `${m} phút trước`;
      if (h < 24) return `${h} giờ trước`;
      if (d < 30) return `${d} ngày trước`;
    } else {
      if (m < 1) return 'Just now';
      if (m < 60) return `${m}m ago`;
      if (h < 24) return `${h}h ago`;
      if (d < 30) return `${d}d ago`;
    }
    return new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const locatedCount = useMemo(
    () => mapPets.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).length,
    [mapPets],
  );

  const pageTitle =
    type === 'lost' ? t('home.lost') : type === 'found' ? t('home.found') : t('home.all');

  const featured = pets[0] || null;
  const rest = pets.slice(1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{pageTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? t('home.loading') : `${total} ${t('home.results')}`}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-10 space-y-3">
        {/*
          Ô tìm kiếm đặt trên cùng vì đây là đường vào chính, các nút lọc bên
          dưới chỉ để thu hẹp thêm.
        */}
        <div className="relative">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            id="q"
            name="q"
            type="text"
            maxLength={200}
            aria-label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            value={goQ}
            onChange={(e) => setGoQ(e.target.value)}
            className="w-full border border-gray-200 rounded-full pl-11 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
          />
          {goQ && (
            <button
              type="button"
              onClick={xoaTimKiem}
              aria-label={t('search.clear')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 p-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {goQ && <p className="text-xs text-gray-500 -mt-1">{t('search.hint')}</p>}

        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => doiLoai(tab.value)}
              className={
                'px-4 py-2 rounded-full text-sm font-medium transition-all ' +
                (type === tab.value ? tab.activeClass : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')
              }
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            {SPECIES_TABS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSpecies(s.value)}
                className={
                  'px-4 py-2 rounded-full text-sm font-medium transition-all ' +
                  (species === s.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
          <input
            id="area"
            name="area"
            type="text"
            aria-label={t('filter.area')}
            placeholder={t('filter.area')}
            value={goArea}
            onChange={(e) => setGoArea(e.target.value)}
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {DAYS_TABS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDays(d.value)}
                className={
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all ' +
                  (days === d.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>

          {/*
            Đang tìm kiếm thì kết quả sắp theo độ liên quan, chọn ngày ở đây
            không còn tác dụng — khoá lại còn hơn để người ta bấm rồi tưởng hỏng.
          */}
          <select
            id="sort"
            name="sort"
            aria-label={t('filter.sort')}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            disabled={!!q}
            title={q ? t('search.sortLocked') : ''}
            className="border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="newest">{t('sort.newest')}</option>
            <option value="oldest">{t('sort.oldest')}</option>
          </select>

          {/*
            Bật khoảng cách ngay tại đây, chứ không bắt người ta sang tab bản
            đồ mới bấm được. Nút chỉ hiện khi chưa biết vị trí; biết rồi thì nó
            biến mất và mọi thẻ tin tự hiện khoảng cách.
          */}
          {!me && !locating && (
            <button
              type="button"
              onClick={locateMe}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('home.showDistance')}
            </button>
          )}

          <div className="flex items-center bg-gray-100 rounded-full p-0.5">
            {[
              ['list', 'map.listView'],
              ['map', 'map.mapView'],
            ].map(([ma, khoa]) => (
              <button
                key={ma}
                type="button"
                onClick={() => setView(ma)}
                aria-pressed={view === ma}
                className={
                  'px-3 py-1 rounded-full text-xs font-semibold transition-all ' +
                  (view === ma ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-600')
                }
              >
                {t(khoa)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bản đồ: dùng chung bộ lọc với danh sách */}
      {view === 'map' &&
        (mapLoading ? (
          <p className="text-sm text-gray-500 text-center py-16">{t('mine.loading')}</p>
        ) : !locatedCount ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-500">{t('map.noLocated')}</p>
          </div>
        ) : (
          <PetMap controls pets={mapPets} unlocatedCount={mapWithoutCoords} capped={mapCapped} />
        ))}

      {/* Khung xương lúc đang tải */}
      {view === 'list' && loading && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse mb-5">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-3/5 aspect-video sm:aspect-[16/9] bg-gray-200" />
              <div className="sm:w-2/5 p-6 space-y-4">
                <div className="h-3 bg-gray-200 rounded-full w-1/3" />
                <div className="h-6 bg-gray-200 rounded-full w-3/4" />
                <div className="h-4 bg-gray-200 rounded-full w-1/2" />
                <div className="h-4 bg-gray-200 rounded-full w-2/3" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-200 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'list' && !loading && pets.length === 0 && (
        <div className="text-center py-28">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-base">{t('home.empty')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('home.emptySub')}</p>
          <Link
            to="/new"
            className="mt-5 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            {t('home.postNow')}
          </Link>
        </div>
      )}

      {view === 'list' && !loading && featured && (
        <div>
          {/* Thẻ tin nổi bật */}
          <Link
            to={`/pet/${featured._id}`}
            className="group block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 mb-5"
          >
            <div className="flex flex-col sm:flex-row">
              {/*
                Không có ảnh thì bỏ hẳn cột ảnh, nhường chỗ cho phần chữ. Một ô
                xám to bằng 3/5 thẻ chỉ để chứa biểu tượng thì nhìn như web hỏng.

                GIỮ aspect-video ở mọi kích thước. Đã thử bỏ nó từ sm trở lên
                để cột chữ khỏi bị kéo giãn, và hỏng nặng hơn: ảnh chân dung
                không còn bị ràng buộc tỉ lệ nên giãn theo tỉ lệ gốc ở 3/5
                chiều ngang, cao gấp đôi lúc trước.
              */}
              {featured.image && (
                <div className="relative sm:w-3/5 aspect-video overflow-hidden bg-gray-100">
                  <PetPhoto
                    src={featured.image}
                    alt={featured.breed}
                    type={featured.type}
                    resolved={featured.resolved}
                    width={800}
                    imgClass="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${mauNhan(featured)}`}>
                    {t(khoaNhan(featured))}
                  </span>
                </div>
              )}

              <div className={`p-6 sm:p-8 flex flex-col ${featured.image ? 'sm:w-2/5' : 'w-full'}`}>
                {/*
                  Căn giữa theo chiều dọc thay vì dồn hết chữ lên trên. Cột chữ
                  luôn thấp hơn cột ảnh, nên chỗ nào cũng dư ra một khoảng. Đặt
                  chữ ở giữa thì khoảng đó chia đều trên dưới và trông như có ý.
                */}
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
                    {t('home.featured')}
                  </p>
                  {/* Mất cột ảnh thì mất luôn chỗ gắn nhãn loại tin, dựng lại ở đây. */}
                  {!featured.image && (
                    <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mb-3 ${mauNhan(featured)}`}>
                      {t(khoaNhan(featured))}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1 break-words">
                    {featured.name || featured.breed}
                  </h2>
                  {/*
                    Thêm màu lông: loài, giống, màu là ba thứ người ta dùng để
                    nhận ra con vật của mình. Thẻ nhỏ không đủ chỗ nên chỉ hiện
                    loài và giống, còn thẻ này thì đủ.
                  */}
                  <p className="text-sm text-gray-500 mb-3 break-words">
                    {featured.species} · {featured.breed}
                    {featured.color ? ` · ${featured.color}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mb-4">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 break-words min-w-0">{featured.area}</p>
                  </div>
                  {featured.description && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                      {featured.description}
                    </p>
                  )}
                </div>

                {/*
                  Khoảng cách hiện ở đây giống hệt thẻ nhỏ. Trước đây thẻ này
                  không có, nên tin mới nhất — tin được chú ý nhất — lại là tin
                  duy nhất không cho biết nó ở gần hay xa.
                */}
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <p className="text-xs text-gray-500 shrink-0">{thoiGian(featured.date)}</p>
                    {khoangCach(featured) && (
                      <p className="text-xs text-gray-500 shrink-0">
                        {t('card.away', { d: khoangCach(featured) })}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-accent group-hover:text-accent transition-colors shrink-0">
                    {t('home.view')}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {rest.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('home.more')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((pet) => (
                  <Link
                    key={pet._id}
                    to={`/pet/${pet._id}`}
                    className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <PetPhoto
                        src={pet.image}
                        alt={pet.breed}
                        type={pet.type}
                        resolved={pet.resolved}
                        width={600}
                        imgClass="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${mauNhan(pet)}`}>
                        {t(khoaNhan(pet))}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 text-base leading-tight break-words">
                        {pet.name || pet.breed}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5 break-words">
                        {pet.species} · {pet.breed}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-gray-500 truncate">{pet.area}</p>
                      </div>
                      {/*
                        Mô tả là chỗ chứa đặc điểm giúp người ta NHẬN RA con vật
                        của mình: lông xoăn, đeo vòng cổ đỏ, sợ người lạ. Tên và
                        giống thì tin nào cũng na ná nhau.

                        Luôn chiếm đúng hai dòng, kể cả khi mô tả ngắn hoặc
                        không có. Lưới thẻ kéo mọi thẻ cao bằng thẻ cao nhất
                        trong hàng, nên thẻ nào nội dung ngắn hơn sẽ bị dư ra
                        một khoảng trắng ngay trên hàng dưới cùng.
                      */}
                      <p className="text-sm text-gray-500 leading-relaxed mt-2 line-clamp-2 min-h-[2.85rem]">
                        {pet.description}
                      </p>
                      {/*
                        Mã tin cố ý KHÔNG hiện ở đây. Người lạ lướt danh sách
                        không cần tới nó, mà in ra thì vừa rối mắt vừa giống thứ
                        gì đó quan trọng.

                        Hàng dưới cùng: bên trái là thời gian, bên phải là
                        khoảng cách nếu biết vị trí người xem. Không biết thì
                        thay bằng lời mời bấm vào, chứ không để trống một nửa.
                      */}
                      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-500">{thoiGian(pet.date)}</p>
                        {khoangCach(pet) ? (
                          <p className="text-xs text-gray-500 shrink-0">
                            {t('card.away', { d: khoangCach(pet) })}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-500 group-hover:text-accent transition-colors shrink-0">
                            {t('card.detail')} →
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            {total > pets.length ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-full text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {loadingMore && (
                  <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loadingMore ? t('home.loadingMore') : t('home.loadMore')}
              </button>
            ) : (
              pets.length > 0 && <p className="text-sm text-gray-500">{t('home.noMore')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
