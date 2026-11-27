import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import auth from '../auth';
import PetPhoto from '../components/PetPhoto.jsx';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

export default function MyPets() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let bo = false;
    setLoading(true);

    api
      .myPets()
      .then(({ data }) => {
        if (!bo) setPets(data.pets);
      })
      .catch(() => {
        if (bo) return;
        setPets([]);
        /*
         * Mất phiên giữa chừng thì đưa thẳng về trang đăng nhập, đừng để lại
         * trang rỗng.
         *
         * Trang rỗng ở đây có nghĩa là "bạn chưa đăng tin nào" — nói sai hẳn
         * với sự thật, và người dùng sẽ đi tìm tin của họ ở chỗ khác. Bộ chặn
         * lỗi của axios đã hiện thông báo giải thích rồi.
         */
        if (!auth.isLoggedIn()) {
          navigate('/login?next=%2Fme', { replace: true });
        }
      })
      .finally(() => {
        if (!bo) setLoading(false);
      });

    return () => { bo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const danhDau = async (pet) => {
    if (!window.confirm(t('detail.resolveConfirm'))) return;
    setBusyId(pet._id);
    try {
      const { data } = await api.updatePet(pet._id, { resolved: true });
      /*
       * Thay cả phần tử trong mảng, không sửa tại chỗ.
       *
       * Bản Vue dùng Object.assign(pet, data) — sửa thẳng object cũ, và Vue tự
       * nhận ra. React thì so sánh theo tham chiếu: sửa tại chỗ rồi gọi
       * setPets(pets) là React thấy "vẫn mảng cũ, vẫn phần tử cũ" và không vẽ
       * lại gì cả. Nhãn tin vẫn ghi "Bị mất" dù máy chủ đã nhận.
       */
      setPets((cu) => cu.map((p) => (p._id === pet._id ? data : p)));
      showToast(t('detail.resolvedBanner'));
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const xoa = async (pet) => {
    if (!window.confirm(t('detail.confirm'))) return;
    setBusyId(pet._id);
    try {
      await api.deletePet(pet._id);
      setPets((cu) => cu.filter((p) => p._id !== pet._id));
      showToast(t('delete.success'));
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const soDaXong = pets.filter((p) => p.resolved).length;
  const summary = [
    { label: t('mine.total'), value: pets.length, color: 'text-gray-900' },
    { label: t('mine.open'), value: pets.length - soDaXong, color: 'text-accent' },
    { label: t('mine.resolved'), value: soDaXong, color: 'text-primary' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('mine.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('mine.subtitle')}</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          {t('nav.post')}
        </Link>
      </div>

      {pets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {summary.map((card) => (
            <div key={card.label} className="bg-card rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <p className={'text-2xl font-bold ' + card.color}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-12">{t('mine.loading')}</p>
      ) : pets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-500">{t('mine.empty')}</p>
          <Link to="/new" className="inline-block mt-3 text-sm font-semibold text-accent hover:underline">
            {t('mine.emptyAction')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => (
            <div
              key={pet._id}
              className="bg-card rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start"
            >
              <Link to={`/pet/${pet._id}`} className="shrink-0">
                {/* Ô 96px, chữ "Chưa có ảnh" không vừa nên chỉ để dấu chân. */}
                <div className="w-24 h-24 rounded-xl overflow-hidden">
                  <PetPhoto
                    src={pet.image}
                    alt={pet.breed}
                    type={pet.type}
                    resolved={pet.resolved}
                    label={false}
                    width={192}
                  />
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      'text-[11px] font-bold px-2 py-0.5 rounded-full ' +
                      (pet.resolved
                        ? 'bg-primary text-on-primary'
                        : pet.type === 'lost'
                          ? 'bg-lost text-on-brand'
                          : 'bg-found text-on-brand')
                    }
                  >
                    {t(pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found')}
                  </span>
                  {/*
                    Mã tin hiện Ở ĐÂY chứ không ở trang chi tiết: đây là trang
                    của chính chủ tin, còn trang chi tiết thì người lạ cũng xem.
                  */}
                  <span className="text-xs text-gray-500 font-mono">{pet.postId}</span>
                </div>

                <Link
                  to={`/pet/${pet._id}`}
                  className="block text-base font-bold text-gray-900 mt-1 hover:text-accent transition-colors"
                >
                  {pet.name || pet.breed}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pet.color} · {pet.area} · {formatDate(pet.date)}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  {!pet.resolved && (
                    <button
                      type="button"
                      onClick={() => danhDau(pet)}
                      disabled={busyId === pet._id}
                      className="border-2 border-primary-border text-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-soft disabled:opacity-50 transition-all"
                    >
                      {t('detail.resolve')}
                    </button>
                  )}
                  <Link
                    to={`/pet/${pet._id}/edit`}
                    className="border-2 border-gray-400 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-gray-500 hover:bg-gray-50 transition-all"
                  >
                    {t('detail.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => xoa(pet)}
                    disabled={busyId === pet._id}
                    className="text-danger px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-danger-soft disabled:opacity-50 transition-all"
                  >
                    {t('detail.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
