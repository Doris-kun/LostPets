import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/language.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge } from '../components/PetCard.jsx';

/*
 * Trang chi tiết một tin: xem, chia sẻ, đánh dấu đã đoàn tụ, sửa, xoá.
 *
 * Dịch từ Vue: views/PetDetail.vue
 */

// Số điện thoại -> bấm gọi. Còn lại coi là email -> mở trình gửi thư.
function buildContactHref(contact) {
  const isPhoneNumber = /^[\d\s+\-()]+$/.test(contact);
  return isPhoneNumber ? `tel:${contact.replace(/\s/g, '')}` : `mailto:${contact}`;
}

function formatFullDate(date, lang) {
  return new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PetDetail() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  // Vue: this.$route.params.id   ->  React: useParams()
  // Tên 'id' phải khớp khai báo <Route path="/pet/:id"> trong App.jsx.
  const { id } = useParams();

  // Vue: this.$router.push('/')  ->  React: navigate('/')
  const navigate = useNavigate();

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Tải tin. Phụ thuộc [id] nên đi từ tin này sang tin khác là tự tải lại.
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    api
      .getPet(id)
      .then(({ data }) => {
        if (!ignore) setPet(data);
      })
      .catch(() => {
        // API trả 404 kèm { message: 'Pet not found' } khi _id không tồn tại.
        if (!ignore) setPet(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleDelete = async () => {
    // Dùng confirm() của trình duyệt y như bản Vue. Xấu nhưng chắc chắn chặn được
    // thao tác nhầm. Muốn hộp thoại đẹp hơn thì làm sau, không ảnh hưởng logic.
    if (!window.confirm(t('detail.confirm'))) return;

    setDeleting(true);
    try {
      await api.deletePet(pet._id);
      showToast(t('delete.success'));
      navigate('/');
    } catch {
      setDeleting(false);
      showToast(t('form.saveError'), 'error');
    }
  };

  const handleResolve = async () => {
    if (!window.confirm(t('detail.resolveConfirm'))) return;

    setResolving(true);
    try {
      // PUT /pets/:id chỉ cần gửi trường muốn đổi, trả về object sau khi cập nhật.
      const { data } = await api.updatePet(pet._id, { resolved: true });
      setPet(data);
      showToast(t('detail.resolvedBanner'));
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setResolving(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    // navigator.share chỉ có trên điện thoại và vài trình duyệt máy tính.
    if (navigator.share) {
      try {
        await navigator.share({ title: pet.name || pet.breed, url });
      } catch {
        // Người dùng bấm huỷ bảng chia sẻ — không phải lỗi, im lặng bỏ qua.
      }
      return;
    }

    /*
     * navigator.clipboard CHỈ tồn tại trên https hoặc localhost.
     * Mở web qua IP mạng LAN (http://192.168.x.x:5173) để test trên điện thoại
     * thì nó là undefined -> bản Vue nuốt lỗi, người dùng bấm mà không thấy gì
     * xảy ra và không hiểu tại sao. Ở đây báo lỗi rõ ràng.
     */
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('detail.linkCopied'));
    } catch {
      showToast(t('form.saveError'), 'error');
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!pet) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <BackLink label={t('detail.back')} />
        <div className="mt-6 text-center py-20">
          <p className="text-gray-400">{t('detail.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <BackLink label={t('detail.back')} />

      <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative aspect-video bg-gray-100">
          {pet.image ? (
            <img src={pet.image} alt={pet.breed} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-20 h-20 text-gray-200"
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
          )}

          <StatusBadge pet={pet} className="top-4 left-4 text-sm px-3 py-1.5" />

          {pet.postId && (
            <span className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1.5 rounded-full">
              {pet.postId}
            </span>
          )}
        </div>

        {pet.resolved && (
          <div className="mx-6 mt-6 flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
            <svg
              className="w-4 h-4 text-teal-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-semibold text-teal-700">{t('detail.resolvedBanner')}</p>
          </div>
        )}

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {pet.name || pet.breed}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {pet.species} · {pet.breed} · {formatFullDate(pet.date, lang)}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <InfoBox label={t('detail.color')} value={pet.color} />
            <InfoBox label={t('detail.area')} value={pet.area} />
          </div>

          {pet.description && (
            <div className="mt-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
                {t('detail.desc')}
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">{pet.description}</p>
            </div>
          )}

          <div className="mt-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-400 font-bold uppercase tracking-wide mb-1">
              {t('detail.contact')}
            </p>
            <a
              href={buildContactHref(pet.contact)}
              className="text-gray-900 font-bold text-base hover:text-orange-600 transition-colors"
            >
              {pet.contact}
            </a>
          </div>

          <div className="flex gap-3 mt-5 flex-wrap">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 border-2 border-gray-200 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {t('detail.share')}
            </button>

            {/* Chỉ hiện khi tin chưa được đánh dấu đoàn tụ */}
            {!pet.resolved && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="flex items-center gap-1.5 border-2 border-teal-200 text-teal-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-50 disabled:opacity-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t('detail.resolve')}
              </button>
            )}

            {/* Ô trống co giãn, đẩy 2 nút sau sang phải */}
            <div className="flex-1" />

            <Link
              to={`/pet/${pet._id}/edit`}
              className="border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              {t('detail.edit')}
            </Link>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-all"
            >
              {deleting ? t('detail.deleting') : t('detail.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackLink({ label }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-gray-800 font-semibold text-sm">{value}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-4 w-28 bg-gray-100 rounded-full animate-pulse" />
      <div className="mt-5 bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
        <div className="aspect-video bg-gray-200" />
        <div className="p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded-full w-1/2" />
          <div className="h-4 bg-gray-200 rounded-full w-1/3" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
