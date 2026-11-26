import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import PetMap from '../components/PetMap.jsx';
import PetPhoto from '../components/PetPhoto.jsx';
import ReportDialog from '../components/ReportDialog.jsx';
import { directionsUrl } from '../map';
import claim from '../claim';
import report from '../report';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

export default function PetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [matches, setMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [matchDone, setMatchDone] = useState(false);

  const [claimCode, setClaimCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);

  /*
   * Nạp tin mỗi khi :id đổi, KHÔNG chỉ lúc mở trang.
   *
   * Bấm vào một tin trong danh sách gợi ý sẽ đổi :id nhưng vẫn dùng lại chính
   * component này — React không gắn lại từ đầu, y như created() của Vue không
   * chạy lần hai. Không theo dõi id thì trang vẫn hiện tin cũ kèm kết quả đối
   * chiếu cũ.
   *
   * Dọn luôn mọi thứ thuộc về tin trước. Mã xác nhận của tin cũ mà còn nằm
   * đây thì người dùng chép nhầm mã sang tin khác — và mã đó là thứ duy nhất
   * cho phép sửa hoặc xoá một tin.
   */
  useEffect(() => {
    let bo = false;

    setMatches([]);
    setMatchError('');
    setMatchDone(false);
    setShowCode(false);
    setCopied(false);

    setLoading(true);
    setClaimCode(claim.get(id));
    setReported(report.has(id));

    api
      .getPet(id)
      .then(({ data }) => {
        if (!bo) setPet(data);
      })
      .catch(() => {
        if (!bo) setPet(null);
      })
      .finally(() => {
        if (!bo) setLoading(false);
      });

    return () => { bo = true; };
  }, [id]);

  // Hẹn giờ của nút Sao chép còn chạy khi rời trang thì nó gọi setCopied trên
  // một màn hình không còn ai xem.
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const hasCoords = pet && Number.isFinite(pet.lat) && Number.isFinite(pet.lng);

  /*
   * Số điện thoại thì gọi, còn lại coi là email.
   *
   * Nhận dạng bằng "chỉ gồm chữ số và dấu của số điện thoại" chứ không tìm
   * dấu @: người dùng gõ thiếu @ thì ra mailto hỏng, còn ở đây ra một link
   * tel hỏng — cả hai đều hỏng, nhưng cách này không bao giờ biến một số điện
   * thoại thành email.
   */
  const contactHref = (() => {
    if (!pet) return '#';
    const c = pet.contact;
    return /^[\d\s+\-()]+$/.test(c) ? `tel:${c.replace(/\s/g, '')}` : `mailto:${c}`;
  })();

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt cũ, hoặc trang không chạy HTTPS, thì không có clipboard.
      // Mã đã để select-all nên vẫn bôi đen một nhấp rồi Ctrl+C được.
    }
  };

  const findMatches = async () => {
    setMatchLoading(true);
    setMatchError('');
    setMatches([]);
    try {
      const { data } = await api.findMatches(pet._id);
      setMatches(data.matches || []);
      setMatchDone(true);
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 429) setMatchError(t('match.limit'));
      else if (status === 504) setMatchError(t('match.busy'));
      else setMatchError(t('match.error'));
    } finally {
      setMatchLoading(false);
    }
  };

  // 403 nghĩa là trình duyệt này không giữ mã xác nhận của tin.
  const claimMessage = useCallback(
    (err) => {
      const status = err.response && err.response.status;
      return status === 403 ? t('claim.denied') : t('form.saveError');
    },
    [t],
  );

  const deletePet = async () => {
    if (!window.confirm(t('detail.confirm'))) return;
    setDeleting(true);
    try {
      await api.deletePet(pet._id);
      showToast(t('delete.success'));
      navigate('/');
    } catch (err) {
      setDeleting(false);
      showToast(claimMessage(err), 'error');
    }
  };

  const datTrangThai = async (resolved) => {
    const hoi = resolved ? 'detail.resolveConfirm' : 'detail.unresolveConfirm';
    if (!window.confirm(t(hoi))) return;
    setResolving(true);
    try {
      const { data } = await api.updatePet(pet._id, { resolved });
      setPet(data);
      showToast(t(resolved ? 'detail.resolvedBanner' : 'detail.unresolved'));
    } catch (err) {
      showToast(claimMessage(err), 'error');
    } finally {
      setResolving(false);
    }
  };

  const sharePet = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: pet.name || pet.breed, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t('detail.linkCopied'));
      }
    } catch {
      /* người dùng bấm huỷ */
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        {t('detail.back')}
      </Link>

      {loading ? (
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
      ) : !pet ? (
        <div className="mt-6 text-center py-20">
          <p className="text-gray-500">{t('detail.notFound')}</p>
        </div>
      ) : (
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative aspect-video bg-gray-100">
            <PetPhoto src={pet.image} alt={pet.breed} type={pet.type} resolved={pet.resolved} width={1200} />
            <span
              className={
                'absolute top-4 left-4 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-md ' +
                (pet.resolved ? 'bg-teal-500' : pet.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500')
              }
            >
              {t(pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found')}
            </span>
            {/*
              Mã tin không hiện ở đây: trang này dành cho người đang tìm con
              vật, không phải cho việc tra cứu nội bộ. Chủ tin xem mã ở "Tin
              của tôi", quản trị viên xem ở trang quản trị.
            */}
          </div>

          {pet.resolved && (
            <div className="mx-6 mt-6 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-teal-700">{t('detail.resolvedBanner')}</p>
                <div className="flex-1" />
                {/*
                  Đường lùi lại. Đánh dấu đoàn tụ là hẹn giờ xoá tin, nên bấm
                  nhầm mà không gỡ ra được thì người dùng mất tin vì một cú
                  chạm. Ai không giữ mã xác nhận thì máy chủ chặn, y như nút
                  Sửa và Xoá bên dưới.
                */}
                <button
                  type="button"
                  onClick={() => datTrangThai(false)}
                  disabled={resolving}
                  className="text-xs font-semibold text-teal-600 underline underline-offset-2 hover:text-teal-800 disabled:opacity-50 flex-shrink-0"
                >
                  {t('detail.unresolve')}
                </button>
              </div>
              <p className="text-xs text-teal-600 mt-1.5 leading-relaxed">{t('detail.resolvedExpiry')}</p>
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{pet.name || pet.breed}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {pet.species} · {pet.breed} · {formatDate(pet.date)}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">{t('detail.color')}</p>
                <p className="text-gray-800 font-semibold text-sm">{pet.color}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">{t('detail.area')}</p>
                <p className="text-gray-800 font-semibold text-sm">{pet.area}</p>
              </div>
            </div>

            {hasCoords && (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{t('map.where')}</p>
                  <a
                    href={directionsUrl(pet.lat, pet.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-orange-300 hover:text-orange-600 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    {t('map.directions')}
                  </a>
                </div>
                {/*
                  key theo _id: đổi sang tin khác thì dựng lại hẳn bản đồ.
                  Không có nó thì Leaflet giữ nguyên khung nhìn của tin trước —
                  bản đồ chỉ đúng chỗ ở lần mở đầu tiên.
                */}
                <PetMap key={pet._id} pets={[pet]} height="h-56" />
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{t('map.approxNote')}</p>
              </div>
            )}

            {pet.description && (
              <div className="mt-5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{t('detail.desc')}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{pet.description}</p>
              </div>
            )}

            <div className="mt-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs text-orange-400 font-bold uppercase tracking-wide mb-1">{t('detail.contact')}</p>
              <a href={contactHref} className="text-gray-900 font-bold text-base hover:text-orange-600 transition-colors">
                {pet.contact}
              </a>
            </div>

            {/* Cảnh báo đặt ngay dưới số liên hệ, đúng lúc người ta sắp gọi */}
            <div className="mx-6 mt-3 flex gap-2.5 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-rose-700 leading-relaxed">{t('scam.warning')}</p>
            </div>

            {/* Chỉ chủ tin mới nhận được secretDetail từ server, nên chỉ họ thấy ô này */}
            {pet.secretDetail && (
              <div className="mx-6 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{t('secret.yours')}</p>
                </div>
                <p className="text-sm text-amber-900 font-medium">{pet.secretDetail}</p>
                <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">{t('secret.howToUse')}</p>
              </div>
            )}

            <div className="flex gap-3 mt-5 flex-wrap">
              <button
                type="button"
                onClick={sharePet}
                className="flex items-center gap-1.5 border-2 border-gray-200 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('detail.share')}
              </button>

              {!pet.resolved && (
                <button
                  type="button"
                  onClick={() => datTrangThai(true)}
                  disabled={resolving}
                  className="flex items-center gap-1.5 border-2 border-teal-200 text-teal-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-50 disabled:opacity-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('detail.resolve')}
                </button>
              )}

              <div className="flex-1" />

              <Link
                to={`/pet/${pet._id}/edit`}
                className="border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                {t('detail.edit')}
              </Link>
              <button
                type="button"
                onClick={deletePet}
                disabled={deleting}
                className="bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-all"
              >
                {deleting ? t('detail.deleting') : t('detail.delete')}
              </button>
            </div>

            {/*
              Mã xác nhận chỉ hiện khi trình duyệt này có mã của tin, và phải
              bấm mới hiện. Người dùng bình thường không cần biết nó tồn tại —
              mã nằm sẵn trong localStorage và tự gắn vào mỗi lần sửa. Chỗ này
              dành cho đúng một việc: mang mã sang máy khác.
            */}
            {claimCode && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {!showCode ? (
                  <button
                    type="button"
                    onClick={() => setShowCode(true)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-600 transition-colors"
                  >
                    {t('claim.view')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">{t('claim.viewTitle')}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/*
                        select-all: bôi đen cả mã chỉ bằng một cú nhấp, phòng
                        khi trình duyệt không cho dùng clipboard.
                      */}
                      <code className="font-mono text-base font-bold tracking-[0.2em] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 select-all">
                        {claimCode}
                      </code>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        {copied ? t('claim.copied') : t('claim.copy')}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{t('claim.viewHint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI đối chiếu với các tin ngược loại để tìm tin có thể là cùng một con vật */}
      {pet && !pet.resolved && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gray-900">{t('match.title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('match.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={findMatches}
              disabled={matchLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-sm"
            >
              {matchLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {matchLoading ? t('match.searching') : t('match.action')}
            </button>
          </div>

          {matches.length > 0 && (
            <div className="mt-4 space-y-3">
              {matches.map((m) => (
                <Link
                  key={m.pet._id}
                  to={`/pet/${m.pet._id}`}
                  className="flex gap-3 items-start border border-gray-100 rounded-xl p-3 hover:border-violet-200 hover:bg-violet-50/40 transition-all"
                >
                  {m.pet.image && (
                    <img src={m.pet.image} alt={m.pet.breed} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{m.pet.breed}</span>
                      <span className="text-xs text-gray-500">{m.pet.area}</span>
                      <span
                        className={
                          'ml-auto text-xs font-bold px-2 py-0.5 rounded-full ' +
                          (m.score >= 70 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500')
                        }
                      >
                        {m.score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.reason}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {matches.length === 0 && matchDone && !matchError && (
            <p className="text-sm text-gray-500 mt-4 text-center py-3">{t('match.none')}</p>
          )}
          {matchError && <p className="text-sm text-rose-500 mt-4 text-center">{matchError}</p>}
        </div>
      )}

      {/*
        Báo cáo tin xấu. Để cuối trang và cố ý nhạt màu: đây là lối thoát
        hiểm, không phải việc người xem bình thường cần làm.
      */}
      {pet && (
        <div className="text-center mt-6">
          {reported ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500 px-4 py-2.5 rounded-full border border-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {t('report.already')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 px-4 py-2.5 rounded-full border border-gray-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
              </svg>
              {t('report.action')}
            </button>
          )}
        </div>
      )}

      {showReport && pet && (
        <ReportDialog
          petId={pet._id}
          onClose={(sent) => {
            setShowReport(false);
            if (sent) setReported(true);
          }}
        />
      )}
    </div>
  );
}
