import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import MapPicker from '../components/MapPicker.jsx';
import { areaFromCoords } from '../geocode';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const O_NHAP =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none ' +
  'focus:ring-2 focus:ring-primary focus:border-transparent transition';

const NHAN = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function EditPet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [form, setForm] = useState({
    type: 'lost', name: '', species: '', breed: '', color: '',
    area: '', contact: '', description: '', secretDetail: '', lat: null, lng: null,
  });

  /*
   * Ba trạng thái ảnh, cùng tồn tại được, và chỉ lúc bấm Lưu mới quyết định
   * gửi gì:
   *
   *   currentImage  ảnh đang lưu trên server
   *   image         file mới vừa chọn
   *   removeImage   ý muốn gỡ hẳn ảnh
   */
  const [currentImage, setCurrentImage] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileRef = useRef(null);

  // Ảnh đang hiển thị: ảnh mới chọn đè lên ảnh cũ, còn khi đã bấm xoá thì trống.
  const shownPhoto = preview || (removeImage ? '' : currentImage);

  useEffect(() => {
    let bo = false;
    setLoading(true);

    api
      .getPet(id)
      .then(({ data }) => {
        if (bo) return;
        setForm({
          type: data.type,
          name: data.name || '',
          species: data.species || '',
          breed: data.breed,
          color: data.color,
          area: data.area,
          contact: data.contact,
          description: data.description || '',
          secretDetail: data.secretDetail || '',
          lat: data.lat,
          lng: data.lng,
        });
        setCurrentImage(data.image || '');
      })
      .catch(() => {
        if (!bo) setError(t('form.saveError'));
      })
      .finally(() => {
        if (!bo) setLoading(false);
      });

    return () => { bo = true; };
    // t đổi khi người dùng đổi ngôn ngữ; không nạp lại tin chỉ vì chuyện đó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
   * URL.createObjectURL giữ file trong bộ nhớ tới khi được thu hồi. Đổi ảnh
   * vài lần rồi rời trang mà không thu hồi là bỏ lại từng đó file trong RAM.
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
     * BIẾT TRƯỚC MỘT CHỖ CÒN THIẾU — xem ghi chú dài hơn trong NewPet.jsx.
     * Riêng trang Sửa tin thì nặng hơn: ô Khu vực LUÔN có chữ ngay khi mở màn
     * vì nó nạp từ máy chủ, nên nhánh tự điền ở đây thực tế chưa bao giờ chạy
     * một lần nào. Chép y bản Vue để PR này là một bản chuyển thuần; sửa
     * trong một PR riêng cho cả hai bản.
     */
    if (form.area.trim()) return;
    const area = await areaFromCoords(lat, lng);
    setForm((cu) => (area && !cu.area.trim() ? { ...cu, area } : cu));
  };

  const boAnhVuaChon = () => {
    setPreview(null);
    setImage(null);
  };

  const chonAnh = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    boAnhVuaChon();
    setImage(file);
    setPreview(URL.createObjectURL(file));
    // Chọn ảnh mới thì ý "xoá ảnh" trước đó không còn nghĩa gì.
    setRemoveImage(false);
  };

  const xoaAnh = () => {
    // Bấm xoá lúc đang xem ảnh vừa chọn thì chỉ là bỏ lựa chọn đó, quay về
    // ảnh cũ — chứ không phải muốn gỡ ảnh khỏi tin.
    if (image) {
      boAnhVuaChon();
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setRemoveImage(true);
  };

  const gui = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Gửi dạng form thay vì JSON vì có thể kèm file ảnh. Server bỏ qua
      // những trường không cho sửa, nên cứ gửi cả form như lúc đăng tin.
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (image) formData.append('image', image);
      else if (removeImage) formData.append('removeImage', 'true');

      await api.updatePet(id, formData);
      showToast(t('edit.success'));
      navigate(`/pet/${id}`);
    } catch (err) {
      const status = err.response && err.response.status;
      // 403 nghĩa là trình duyệt này không giữ mã xác nhận của tin.
      if (status === 403) setError(t('claim.denied'));
      else if (status === 413) setError(t('form.tooLarge'));
      // 502 là Cloudinary lỗi, không phải tin sai — thử lại là được.
      else if (status === 502) setError(t('form.imageFailed'));
      else setError(t('form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const nutChon = (dang, lopDang, lopThuong) =>
    'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ' +
    (dang ? lopDang : lopThuong);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link to={`/pet/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          {t('edit.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{t('edit.title')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
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
                    'bg-lost text-on-brand border-lost',
                    'bg-white text-gray-500 border-gray-200 hover:border-lost',
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
                    'bg-found text-on-brand border-found',
                    'bg-white text-gray-500 border-gray-200 hover:border-found',
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
                      'bg-lost text-on-brand border-lost',
                      'bg-white text-gray-500 border-gray-200 hover:border-lost',
                    )}
                  >
                    {t(loai === 'Chó' ? 'form.dog' : 'form.cat')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.petInfo')}</p>

            <div>
              <label htmlFor="name" className={NHAN}>
                {t('form.name')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
              </label>
              <input id="name" name="name" type="text" value={form.name}
                onChange={(e) => doiO('name', e.target.value)} className={O_NHAP} />
            </div>

            <div>
              <label htmlFor="breed" className={NHAN}>{t('form.breed')}</label>
              <input id="breed" name="breed" type="text" required value={form.breed}
                onChange={(e) => doiO('breed', e.target.value)} className={O_NHAP} />
            </div>

            <div>
              <label htmlFor="color" className={NHAN}>{t('form.color')}</label>
              <input id="color" name="color" type="text" required value={form.color}
                onChange={(e) => doiO('color', e.target.value)} className={O_NHAP} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.locationContact')}</p>

            <div>
              <label htmlFor="area" className={NHAN}>{t('form.area')}</label>
              <input id="area" name="area" type="text" required value={form.area}
                onChange={(e) => doiO('area', e.target.value)} className={O_NHAP} />
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
              <input id="contact" name="contact" type="text" required value={form.contact}
                onChange={(e) => doiO('contact', e.target.value)} className={O_NHAP} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('form.details')}</p>

            <div>
              <label htmlFor="description" className={NHAN}>{t('form.desc')}</label>
              <textarea id="description" name="description" rows={3} value={form.description}
                onChange={(e) => doiO('description', e.target.value)} className={O_NHAP + ' resize-none'} />
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
              <p className="text-xs text-secret-text mt-1.5 leading-relaxed">{t('secret.hint')}</p>
            </div>

            <div>
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('form.photo')} <span className="text-gray-500 font-normal text-xs">{t('form.optional')}</span>
              </span>
              {/*
                Nút thật, không phải div có onClick — xem ghi chú trong
                NewPet.jsx: div thì bàn phím không tới được.
              */}
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-accent-border hover:bg-accent-soft transition-all"
              >
                {shownPhoto ? (
                  <>
                    <img src={shownPhoto} alt="" className="mx-auto max-h-52 rounded-xl object-cover mb-3" />
                    <p className="text-sm text-gray-500">{t('form.photoChange')}</p>
                  </>
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

              {shownPhoto ? (
                <button
                  type="button"
                  onClick={xoaAnh}
                  className="mt-2 text-xs font-semibold text-danger hover:text-danger transition-colors"
                >
                  {t('form.photoRemove')}
                </button>
              ) : (
                // Ảnh chỉ thật sự mất khi bấm Lưu, nên nói rõ và cho đường quay lại.
                removeImage && currentImage && (
                  <p className="mt-2 text-xs text-gray-500">
                    {t('form.photoRemoved')}{' '}
                    <button
                      type="button"
                      onClick={() => setRemoveImage(false)}
                      className="font-semibold text-accent hover:text-accent transition-colors"
                    >
                      {t('form.undo')}
                    </button>
                  </p>
                )
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
            disabled={saving}
            className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-primary-dark disabled:opacity-50 transition-all shadow-sm hover:shadow-primary/30 hover:shadow-lg"
          >
            {saving ? t('form.saving') : t('form.save')}
          </button>
        </form>
      )}
    </div>
  );
}
