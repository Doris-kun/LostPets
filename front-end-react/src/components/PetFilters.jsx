import { useLanguage } from '../context/language.jsx';

/*
 * Thanh bộ lọc trên trang chủ.
 *
 * Dịch từ Vue: phần "Filter bar" + 3 mảng typeTabs/speciesTabs/daysTabs trong views/Home.vue.
 *
 * Component này KHÔNG giữ state, không gọi API. Nó chỉ nhận giá trị hiện tại qua
 * `filters` và báo ngược lên cha qua `onChange`. Cha (Home.jsx) mới là nơi quyết
 * định làm gì với thay đổi đó.
 *
 * Kiểu viết này gọi là "controlled component". Lợi ích: muốn biết tại sao danh
 * sách đang lọc như vậy thì chỉ cần đọc Home.jsx, không phải lần mò qua 2 file.
 */

// Vue để 3 mảng này trong data() — tức mỗi component Home được tạo lại là sinh
// 3 mảng mới. Ở đây đặt ngoài hàm: tạo đúng 1 lần khi file được nạp.
const TYPE_TABS = [
  { value: '', labelKey: 'filter.all', activeClass: 'bg-gray-900 text-white' },
  { value: 'lost', labelKey: 'filter.lost', activeClass: 'bg-rose-500 text-white' },
  { value: 'found', labelKey: 'filter.found', activeClass: 'bg-emerald-500 text-white' },
];

// Giá trị gửi lên API phải khớp dữ liệu trong database, nên để nguyên 'Chó'/'Mèo'
// tiếng Việt. Chữ hiển thị thì lấy từ word.js nên vẫn đổi theo VI/EN bình thường.
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

export default function PetFilters({ filters, onChange }) {
  const { t } = useLanguage();

  // Gộp thay đổi vào bộ lọc cũ: onChange({ species: 'Chó' }) chỉ đổi species.
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-10 space-y-3">
      {/* Hàng 1 — loại tin */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => update({ type: tab.value })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.type === tab.value
                ? tab.activeClass
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Hàng 2 — loài + ô tìm khu vực */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          {SPECIES_TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => update({ species: item.value })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.species === item.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {/*
         * Vue: v-model="filters.area" — hai chiều, Vue tự đồng bộ.
         * React: phải viết tay cả hai chiều — value để hiện ra, onChange để nhận.
         * Thiếu onChange thì ô nhập bị khoá cứng, gõ không lên chữ.
         */}
        <input
          type="text"
          value={filters.area}
          onChange={(event) => update({ area: event.target.value })}
          placeholder={t('filter.area')}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent placeholder-gray-400"
        />
      </div>

      {/* Hàng 3 — khoảng thời gian + sắp xếp */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {DAYS_TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => update({ days: item.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.days === item.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <select
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value })}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white cursor-pointer"
        >
          <option value="newest">{t('sort.newest')}</option>
          <option value="oldest">{t('sort.oldest')}</option>
        </select>
      </div>
    </div>
  );
}
