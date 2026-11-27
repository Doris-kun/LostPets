import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import MapPicker from '../components/MapPicker.jsx';
import { areaFromCoords } from '../geocode';
import claim from '../claim';
import auth from '../auth';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const FORM_RONG = {
  type: 'lost',
  name: '',
  species: '',
  breed: '',
  color: '',
  area: '',
  contact: '',
  description: '',
  secretDetail: '',
  lat: null,
  lng: null,
};

const O_NHAP =
  'w-full border border-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none ' +
  'focus:ring-2 focus:ring-primary focus:border-transparent transition';

const NHAN = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function NewPet() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState(FORM_RONG);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSpeciesError, setShowSpeciesError] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const fileRef = useRef(null);

  /*
   * Số thứ tự lượt chạy AI, và cờ đã rời trang.
   *
   * Người dùng đổi ảnh khi lượt trước chưa xong thì kết quả cũ về muộn sẽ ghi
   * đè kết quả của ảnh mới. Đánh số từng lượt rồi chỉ nhận lượt mới nhất.
   */
  const aiRun = useRef(0);
  const gone = useRef(false);
  useEffect(() => () => { gone.current = true; }, []);

  /*
   * Thu hồi URL xem trước khi đổi ảnh hoặc rời trang.
   *
   * URL.createObjectURL giữ cả file trong bộ nhớ cho tới khi được thu hồi.
   * Đổi ảnh vài lần rồi rời trang mà không thu hồi là bỏ lại từng đó file
   * trong RAM — ảnh điện thoại bây giờ vài MB một tấm.
   *
   * Bản Vue của trang này KHÔNG thu hồi (EditPet.vue thì có, hàm
   * releasePreview). Chép y nguyên là chép luôn chỗ rò rỉ đó, nên ở đây làm
   * đúng — React có sẵn chỗ dọn trong useEffect.
   */
  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const doiO = (key, value) => setForm((cu) => ({ ...cu, [key]: value }));

  const chonDiem = async ({ lat, lng }) => {
    setForm((cu) => ({ ...cu, lat, lng }));
    if (lat === null || lng === null) return;

    /*
     * Tự điền ô "khu vực" từ toạ độ, nhưng CHỈ KHI ô đó đang trống.
     *
     * Người dùng gõ tay thì luôn đúng hơn máy: họ biết "hẻm 54 Nguyễn Văn
     * Nghi" còn máy chỉ biết "Gò Vấp".
     *
     * BIẾT TRƯỚC MỘT CHỖ CÒN THIẾU, chép y bản Vue để PR này là một bản
     * chuyển thuần: luật "chỉ điền khi ô trống" làm lần chọn vị trí THỨ HAI
     * trở đi không bao giờ điền lại, nên kéo ghim sang chỗ khác mà tên khu
     * vực vẫn đứng nguyên chỗ cũ. App di động đã sửa (chữ do bản đồ điền thì
     * được đè, chữ người dùng gõ thì không). Sửa cho web trong một PR riêng,
     * cùng lúc cho cả bản Vue lẫn bản React.
     */
    if (form.area.trim()) return;
    const area = await areaFromCoords(lat, lng);
    // Đợi tên một lát mới về; trong lúc đó người dùng có thể đã tự gõ rồi.
    setForm((cu) => (area && !cu.area.trim() ? { ...cu, area } : cu));
  };

  const phanTichAnh = async (file) => {
    if (!file) return;
    const runId = (aiRun.current += 1);

    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.analyzeImage(formData);
      if (runId !== aiRun.current || gone.current) return;

      // Chỉ điền vào ô còn trống. Người dùng gõ trong lúc chờ thì giữ nguyên
      // thứ họ gõ — AI là phần thêm vào, không phải thứ ghi đè.
      setForm((cu) => ({
        ...cu,
        species: !cu.species && data.species !== 'Khác' ? data.species : cu.species,
        breed: cu.breed || data.breed,
        color: cu.color || data.color,
        description: cu.description || data.description,
      }));
      setAiResult(data);
      setShowSpeciesError(false);
    } catch (err) {
      if (runId !== aiRun.current || gone.current) return;
      const status = err.response && err.response.status;
      if (status === 422) setAiError(t('ai.notPet'));
      else if (status === 504 || status === 429) setAiError(t('ai.busy'));
      else setAiError(t('ai.error'));
    } finally {
      if (runId === aiRun.current) setAiLoading(false);
    }
  };

  const chonAnh = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setAiResult(null);
    setAiError('');
    // Chạy ngay, không chờ người dùng bấm gì. Họ cứ gõ tiếp các ô khác, kết
    // quả về lúc nào thì điền vào chỗ còn trống lúc đó.
    phanTichAnh(file);
  };

  const gui = async (e) => {
    e.preventDefault();
    if (!form.species) {
      setShowSpeciesError(true);
      return;
    }
    setShowSpeciesError(false);
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (image) formData.append('image', image);
      const { data } = await api.createPet(formData);

      // Mã chỉ trả về đúng lần này, lưu ngay để người đăng sửa/xoá được sau.
      // Lưu cả khi đã đăng nhập: mất mật khẩu tài khoản thì trình duyệt này
      // vẫn còn một đường vào tin.
      claim.save(data._id, data.claimCode);

      /*
       * Không đọc mã ra màn hình. Toast chỉ sống 3 giây — không ai chép kịp
       * 10 ký tự hex, nên nó vừa vô dụng vừa làm người dùng tưởng mình đang
       * đánh mất một thứ quan trọng. localStorage mới là chỗ làm việc thật,
       * ai cần mang mã sang máy khác thì xem lại ở trang chi tiết.
       *
       * Đã đăng nhập thì càng không nhắc: tin gắn thẳng vào tài khoản.
       */
      showToast(t(auth.isLoggedIn() ? 'claim.postedUser' : 'claim.postedGuest'));
      navigate('/');
    } catch (err) {
      const status = err.response && err.response.status;
      const message = err.response && err.response.data && err.response.data.message;
      // 413 là ảnh vượt giới hạn dung lượng — nói thẳng để người dùng biết
      // phải đổi ảnh, chứ không phải lỗi chung chung của máy chủ.
      if (status === 413) setError(message || t('form.tooLarge'));
      else setError(t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  const nutChon = (dang, lopDang, lopThuong) =>
    'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ' +
    (dang ? lopDang : lopThuong);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          {t('new.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{t('new.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('new.subtitle')}</p>
      </div>

      <form onSubmit={gui} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.general')}</p>

          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">{t('form.status')}</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => doiO('type', 'lost')}
                aria-pressed={form.type === 'lost'}
                className={nutChon(
                  form.type === 'lost',
                  'bg-lost text-on-brand border-lost shadow-sm',
                  'bg-white text-gray-500 border-gray-400 hover:border-lost',
                )}
              >
                {t('form.lostBtn')}
              </button>
              <button
                type="button"
                onClick={() => doiO('type', 'found')}
                aria-pressed={form.type === 'found'}
                className={nutChon(
                  form.type === 'found',
                  'bg-found text-on-brand border-found shadow-sm',
                  'bg-white text-gray-500 border-gray-400 hover:border-found',
                )}
              >
                {t('form.foundBtn')}
              </button>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">{t('form.species')}</span>
            <div className="flex gap-3">
              {['Chó', 'Mèo'].map((loai) => (
                <button
                  key={loai}
                  type="button"
                  onClick={() => doiO('species', loai)}
                  aria-pressed={form.species === loai}
                  className={nutChon(
                    form.species === loai,
                    'bg-lost text-on-brand border-lost shadow-sm',
                    'bg-white text-gray-500 border-gray-400 hover:border-lost',
                  )}
                >
                  {t(loai === 'Chó' ? 'form.dog' : 'form.cat')}
                </button>
              ))}
            </div>
            {showSpeciesError && <p className="text-xs text-danger mt-1.5">{t('form.speciesError')}</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.petInfo')}</p>

          <div>
            <label htmlFor="name" className={NHAN}>
              {t('form.name')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
            </label>
            <input
              id="name" name="name" type="text"
              value={form.name}
              onChange={(e) => doiO('name', e.target.value)}
              placeholder={t('form.namePh')}
              className={O_NHAP}
            />
          </div>

          <div>
            <label htmlFor="breed" className={NHAN}>{t('form.breed')}</label>
            <input
              id="breed" name="breed" type="text" required
              value={form.breed}
              onChange={(e) => doiO('breed', e.target.value)}
              placeholder={t('form.breedPh')}
              className={O_NHAP}
            />
          </div>

          <div>
            <label htmlFor="color" className={NHAN}>{t('form.color')}</label>
            <input
              id="color" name="color" type="text" required
              value={form.color}
              onChange={(e) => doiO('color', e.target.value)}
              placeholder={t('form.colorPh')}
              className={O_NHAP}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.locationContact')}</p>

          <div>
            <label htmlFor="area" className={NHAN}>{t('form.area')}</label>
            <input
              id="area" name="area" type="text" required
              value={form.area}
              onChange={(e) => doiO('area', e.target.value)}
              placeholder={t('form.areaPh')}
              className={O_NHAP}
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">
              {t('map.label')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
            </span>
            <MapPicker lat={form.lat} lng={form.lng} onChange={chonDiem} />
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t('map.hint')}</p>
          </div>

          <div>
            <label htmlFor="contact" className={NHAN}>{t('form.contact')}</label>
            <input
              id="contact" name="contact" type="text" required
              value={form.contact}
              onChange={(e) => doiO('contact', e.target.value)}
              placeholder={t('form.contactPh')}
              className={O_NHAP}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.details')}</p>

          <div>
            <label htmlFor="description" className={NHAN}>{t('form.desc')}</label>
            <textarea
              id="description" name="description" rows={3}
              value={form.description}
              onChange={(e) => doiO('description', e.target.value)}
              placeholder={t('form.descPh')}
              className={O_NHAP + ' resize-none'}
            />
          </div>

          <div>
            <label htmlFor="secretdetail" className={NHAN}>
              {t('secret.label')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
            </label>
            <input
              id="secretdetail" name="secretdetail" type="text" maxLength={200}
              value={form.secretDetail}
              onChange={(e) => doiO('secretDetail', e.target.value)}
              placeholder={t('secret.placeholder')}
              className="w-full border border-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
            <p className="text-xs text-secret-text mt-1.5 leading-relaxed">{t('secret.hint')}</p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('form.photo')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
            </span>
            {/*
              Vùng thả ảnh là một NÚT thật, không phải div có onClick. Div thì
              bàn phím không tới được: người không dùng chuột sẽ không có cách
              nào kèm ảnh vào tin.
            */}
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed border-gray-400 rounded-xl p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-soft transition-all"
            >
              {preview ? (
                <img src={preview} alt="" className="mx-auto max-h-52 rounded-xl object-cover mb-3" />
              ) : (
                <div className="py-4">
                  <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">{t('form.photoUpload')}</p>
                </div>
              )}
            </button>
            <input
              id="fileinput" name="fileinput" type="file" accept="image/*"
              aria-label={t('form.photoUpload')}
              ref={fileRef}
              className="hidden"
              onChange={chonAnh}
            />

            {/* AI chạy ngầm ngay khi chọn ảnh, không chặn người dùng gõ tiếp */}
            {image && (
              <div className="mt-2.5 min-h-[1.5rem]">
                {aiLoading ? (
                  <p className="flex items-center gap-1.5 text-xs text-ai-text">
                    <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {t('ai.working')}
                  </p>
                ) : aiResult ? (
                  <p className="flex items-center gap-1.5 text-xs text-ai-text">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                    </svg>
                    {t('ai.filled')}
                    <span className="font-semibold">{aiResult.confidence}%</span>
                  </p>
                ) : aiError ? (
                  <p className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <span>{aiError}</span>
                    <button
                      type="button"
                      onClick={() => phanTichAnh(image)}
                      className="font-semibold text-ai-text hover:underline"
                    >
                      {t('ai.retry')}
                    </button>
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger-dark bg-danger-soft border border-danger-border rounded-xl px-4 py-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-primary-dark disabled:opacity-50 transition-all shadow-sm hover:shadow-primary/30 hover:shadow-lg"
        >
          {loading ? t('form.submitting') : t('form.submit')}
        </button>
      </form>
    </div>
  );
}
