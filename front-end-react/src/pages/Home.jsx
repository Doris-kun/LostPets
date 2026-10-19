import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/language.jsx';
import PetCard from '../components/PetCard.jsx';
import PetFilters from '../components/PetFilters.jsx';

/*
 * Trang chủ: danh sách tin + bộ lọc + nút xem thêm.
 *
 * Dịch từ Vue: views/Home.vue (phần <script> và luồng dữ liệu).
 * Phần giao diện thẻ tin đã tách sang PetCard.jsx, bộ lọc sang PetFilters.jsx.
 */

const PAGE_SIZE = 9; // Khớp mặc định `limit` của API, xem CONTRIBUTING mục 5.
const AREA_DEBOUNCE_MS = 400;

export default function Home() {
  const { t } = useLanguage();

  /*
   * `type` lấy thẳng từ URL, KHÔNG để trong state.
   *
   * Vue giữ nó ở cả hai nơi: filters.type trong data() và $route.query.type,
   * rồi phải dùng watch để đồng bộ hai chiều. Mỗi lần lệch là sinh lỗi khó tìm.
   *
   * Ở đây URL là nguồn sự thật duy nhất. Nhờ vậy link "Thú Cưng Bị Mất" trên nav
   * (trỏ tới /?type=lost) tự động làm trang này lọc lại, không cần code thêm gì.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') || '';

  // Các bộ lọc còn lại không cần nằm trên URL.
  const [species, setSpecies] = useState('');
  const [area, setArea] = useState('');
  const [days, setDays] = useState('');
  const [sort, setSort] = useState('newest');

  /*
   * Ô khu vực cần hoãn 400ms rồi mới gọi API, không thì gõ "Quận 1" là bắn 6 request.
   *
   * Vue: clearTimeout + setTimeout trong method debounceFetch().
   * React: giữ 2 state — `area` đổi ngay theo từng phím gõ (để ô nhập không khựng),
   * `searchArea` chỉ đổi sau khi ngừng gõ. Chỉ `searchArea` mới kích hoạt gọi API.
   */
  const [searchArea, setSearchArea] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchArea(area), AREA_DEBOUNCE_MS);
    // Dọn timer cũ mỗi khi `area` đổi -> chỉ lần gõ cuối cùng được tính.
    return () => clearTimeout(timer);
  }, [area]);

  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Dựng tham số query cho API. Bỏ qua ô trống để URL gọi đi được gọn.
  const buildParams = useCallback(
    (skip) => {
      const params = { skip, limit: PAGE_SIZE, sort };
      if (type) params.type = type;
      if (species) params.species = species;
      if (searchArea) params.area = searchArea;
      if (days) params.days = days;
      return params;
    },
    [type, species, searchArea, days, sort],
  );

  /*
   * Tải lại từ đầu mỗi khi một bộ lọc bất kỳ đổi.
   *
   * Biến `ignore` xử lý tình huống chạy đua: đổi bộ lọc nhanh tay thì có 2 request
   * cùng bay, và request CŨ có thể về SAU request mới -> danh sách hiện sai kết quả.
   * Khi effect bị dọn (do bộ lọc đổi tiếp), `ignore` thành true và kết quả cũ bị bỏ.
   * Bản Vue không xử lý chỗ này.
   */
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    api
      .getPets(buildParams(0))
      .then(({ data }) => {
        if (ignore) return;
        setPets(data.pets);
        setTotal(data.total);
      })
      .catch(() => {
        if (ignore) return;
        setPets([]);
        setTotal(0);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [buildParams]);

  // Nút "Xem thêm": nối thêm vào danh sách đang có, không thay thế.
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await api.getPets(buildParams(pets.length));
      // Dùng dạng hàm để lấy đúng giá trị mới nhất, tránh đè mất dữ liệu
      // nếu người dùng bấm nhanh hai lần.
      setPets((current) => [...current, ...data.pets]);
      setTotal(data.total);
    } catch {
      // Lỗi thì giữ nguyên danh sách cũ, bấm lại là tải tiếp đúng chỗ đó.
    } finally {
      setLoadingMore(false);
    }
  };

  /*
   * PetFilters trả về trọn bộ lọc mới. Tách `type` ra ghi vào URL,
   * còn lại ghi vào state thường.
   */
  const handleFilterChange = (next) => {
    if (next.type !== type) {
      // replace: true -> không nhồi thêm mục vào lịch sử trình duyệt, để nút Back
      // đưa người dùng về trang trước đó chứ không phải lùi từng bước bộ lọc.
      setSearchParams(next.type ? { type: next.type } : {}, { replace: true });
    }
    setSpecies(next.species);
    setArea(next.area);
    setDays(next.days);
    setSort(next.sort);
  };

  const pageTitle =
    type === 'lost' ? t('home.lost') : type === 'found' ? t('home.found') : t('home.all');

  const [featured, ...rest] = pets;
  const hasMore = total > pets.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{pageTitle}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {loading ? t('home.loading') : `${total} ${t('home.results')}`}
        </p>
      </div>

      <PetFilters filters={{ type, species, area, days, sort }} onChange={handleFilterChange} />

      {loading ? (
        <LoadingSkeleton />
      ) : pets.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PetCard pet={featured} featured />

          {rest.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('home.more')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* key={pet._id}: React cần một giá trị ổn định, duy nhất cho mỗi
                    phần tử. Dùng chỉ số mảng sẽ sai khi danh sách được nối thêm. */}
                {rest.map((pet) => (
                  <PetCard key={pet._id} pet={pet} />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-full text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {loadingMore && (
                  <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {loadingMore ? t('home.loadingMore') : t('home.loadMore')}
              </button>
            ) : (
              <p className="text-sm text-gray-400">{t('home.noMore')}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Khung xám nhấp nháy lúc đang tải — giữ bố cục ổn định, trang không bị giật.
function LoadingSkeleton() {
  return (
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
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
          >
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
  );
}

// Không có tin nào khớp bộ lọc.
function EmptyState() {
  const { t } = useLanguage();

  return (
    <div className="text-center py-28">
      <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-gray-700 font-semibold text-base">{t('home.empty')}</p>
      <p className="text-gray-400 text-sm mt-1">{t('home.emptySub')}</p>
      <Link
        to="/new"
        className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors"
      >
        {t('home.postNow')}
      </Link>
    </div>
  );
}
