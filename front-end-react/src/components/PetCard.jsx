import { Link } from 'react-router-dom';
import { useLanguage } from '../context/language.jsx';

/*
 * Thẻ hiển thị một tin thú cưng.
 *
 * Dịch từ Vue: phần "Featured card" + "More reports grid" trong views/Home.vue.
 *
 * Bản Vue viết markup HAI LẦN: một lần cho thẻ lớn nổi bật, một lần cho thẻ nhỏ
 * trong lưới. Nhãn trạng thái, ảnh thay thế, cách hiện tên... đều bị lặp -> sửa
 * một chỗ phải nhớ sửa chỗ kia.
 *
 * Ở đây gộp thành MỘT component, khác nhau qua prop `featured`:
 *   <PetCard pet={pet} featured />   thẻ lớn, nằm ngang, có mô tả
 *   <PetCard pet={pet} />            thẻ nhỏ trong lưới
 */

// Hiển thị "3 giờ trước" thay vì ngày giờ đầy đủ. Quá 30 ngày thì về ngày tháng.
// Vue: method relativeTime() đọc this.$lang -> ở đây nhận lang qua tham số.
function formatRelativeTime(date, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'vi') {
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 30) return `${days} ngày trước`;
  } else {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Nhãn góc trên ảnh: đã đoàn tụ > bị mất > tìm thấy.
// Export ra ngoài vì trang chi tiết cũng dùng — để màu nhãn chỉ định nghĩa một chỗ.
export function StatusBadge({ pet, className }) {
  const { t } = useLanguage();

  const color = pet.resolved
    ? 'bg-teal-500'
    : pet.type === 'lost'
      ? 'bg-rose-500'
      : 'bg-emerald-500';

  const labelKey = pet.resolved
    ? 'badge.resolved'
    : pet.type === 'lost'
      ? 'badge.lost'
      : 'badge.found';

  return (
    <span
      className={`absolute text-white font-bold rounded-full shadow-md ${color} ${className}`}
    >
      {t(labelKey)}
    </span>
  );
}

/*
 * Ảnh của tin, hoặc hình khung ảnh xám khi không có.
 *
 * API trả `image` là CHUỖI RỖNG (không phải null) khi tin không có ảnh —
 * CONTRIBUTING mục 5 có ghi rõ. Chuỗi rỗng là falsy nên `pet.image ?` xử lý đúng,
 * nhưng nếu lỡ viết `pet.image !== null` thì sẽ ra thẻ <img src=""> hỏng.
 */
function PetImage({ pet, iconSize }) {
  if (pet.image) {
    return (
      <img
        src={pet.image}
        alt={pet.breed}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        className={`${iconSize} text-gray-200`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

// Ghim vị trí, dùng ở cả hai kiểu thẻ.
function LocationIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default function PetCard({ pet, featured = false }) {
  const { lang, t } = useLanguage();

  // Tin không đặt tên thì lấy giống làm tiêu đề, để thẻ không bị trống tiêu đề.
  const title = pet.name || pet.breed;
  const postedAt = formatRelativeTime(pet.date, lang);

  if (featured) {
    return (
      <Link
        to={`/pet/${pet._id}`}
        className="group block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 mb-5"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative sm:w-3/5 aspect-video overflow-hidden bg-gray-100">
            <PetImage pet={pet} iconSize="w-16 h-16" />
            <StatusBadge pet={pet} className="top-4 left-4 text-xs px-3 py-1.5" />
          </div>

          <div className="sm:w-2/5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">
                {t('home.featured')}
              </p>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{title}</h2>
              <p className="text-sm text-gray-400 mb-3">
                {pet.species} · {pet.breed}
              </p>
              <div className="flex items-center gap-1.5 mb-4">
                <LocationIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <p className="text-sm text-gray-500">{pet.area}</p>
              </div>
              {pet.description && (
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                  {pet.description}
                </p>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">{postedAt}</p>
              <span className="text-sm font-semibold text-orange-500 group-hover:text-orange-600 transition-colors">
                {t('home.view')}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/pet/${pet._id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <PetImage pet={pet} iconSize="w-12 h-12" />
        <StatusBadge pet={pet} className="top-3 left-3 text-xs px-2.5 py-1" />
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight">{title}</h3>
        <p className="text-sm text-gray-400 mt-0.5">
          {pet.species} · {pet.breed}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <LocationIcon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          <p className="text-sm text-gray-400 truncate">{pet.area}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400">{postedAt}</p>
          {pet.postId && <p className="text-xs text-gray-300 font-mono">{pet.postId}</p>}
        </div>
      </div>
    </Link>
  );
}
