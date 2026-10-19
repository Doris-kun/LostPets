import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/language.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ChoiceButton,
  ErrorBanner,
  FormSection,
  SubmitButton,
  TextAreaField,
  TextField,
} from '../components/FormFields.jsx';

/*
 * Form sửa một tin đã đăng.
 *
 * Dịch từ Vue: views/EditPet.vue
 *
 * Khác form đăng tin ở hai chỗ:
 *   1. Phải tải dữ liệu cũ về điền sẵn vào các ô trước khi cho sửa.
 *   2. KHÔNG có phần chọn ảnh — PUT /pets/:id không nhận upload file
 *      (CONTRIBUTING mục 5). Ảnh cũ được giữ nguyên vì PUT chỉ cập nhật
 *      những trường được gửi lên, mà form này không gửi `image`.
 */

export default function EditPet() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();

  // null = chưa tải xong. Phân biệt với {} để biết lúc nào được phép hiện form.
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    let ignore = false;

    api
      .getPet(id)
      .then(({ data }) => {
        if (ignore) return;

        /*
         * Chỉ lấy 8 trường form cần, KHÔNG dùng thẳng `data`.
         *
         * Object từ API còn có _id, postId, resolved, date, __v. Nhét cả cục
         * vào form rồi gửi ngược lên là ghi đè những trường không nên đụng tới
         * — ví dụ `resolved` sẽ xoá mất trạng thái đã đoàn tụ.
         *
         * `?? ''` cho các trường không bắt buộc: input của React nhận undefined
         * sẽ chuyển ô đó thành "uncontrolled" và cảnh báo đỏ trong console.
         */
        setForm({
          type: data.type,
          name: data.name ?? '',
          species: data.species ?? '',
          breed: data.breed ?? '',
          color: data.color ?? '',
          area: data.area ?? '',
          contact: data.contact ?? '',
          description: data.description ?? '',
        });
      })
      .catch(() => {
        if (!ignore) setNotFound(true);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.updatePet(id, form);
      showToast(t('edit.success'));
      navigate(`/pet/${id}`);
    } catch {
      setError(t('form.saveError'));
      setSaving(false);
    }
  };

  const backLink = (
    <Link
      to={`/pet/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      {t('edit.back')}
    </Link>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        {backLink}
        <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{t('edit.title')}</h1>
      </div>

      {notFound ? (
        // Bản Vue chỉ hiện dải lỗi đỏ nhưng VẪN vẽ form rỗng bên dưới — người dùng
        // điền vào rồi bấm Lưu, và lần nào cũng lỗi. Ở đây không vẽ form nữa.
        <div className="text-center py-20">
          <p className="text-gray-400">{t('detail.notFound')}</p>
        </div>
      ) : !form ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSection title={t('form.general')}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('form.status')}
              </label>
              <div className="flex gap-3">
                <ChoiceButton
                  active={form.type === 'lost'}
                  onClick={() => setForm((c) => ({ ...c, type: 'lost' }))}
                  activeClass="bg-rose-500 text-white border-rose-500 shadow-sm"
                  hoverClass="hover:border-rose-300"
                >
                  {t('form.lostBtn')}
                </ChoiceButton>
                <ChoiceButton
                  active={form.type === 'found'}
                  onClick={() => setForm((c) => ({ ...c, type: 'found' }))}
                  activeClass="bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  hoverClass="hover:border-emerald-300"
                >
                  {t('form.foundBtn')}
                </ChoiceButton>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('form.species')}
              </label>
              <div className="flex gap-3">
                <ChoiceButton
                  active={form.species === 'Chó'}
                  onClick={() => setForm((c) => ({ ...c, species: 'Chó' }))}
                  activeClass="bg-amber-500 text-white border-amber-500 shadow-sm"
                  hoverClass="hover:border-amber-300"
                >
                  {t('form.dog')}
                </ChoiceButton>
                <ChoiceButton
                  active={form.species === 'Mèo'}
                  onClick={() => setForm((c) => ({ ...c, species: 'Mèo' }))}
                  activeClass="bg-amber-500 text-white border-amber-500 shadow-sm"
                  hoverClass="hover:border-amber-300"
                >
                  {t('form.cat')}
                </ChoiceButton>
              </div>
            </div>
          </FormSection>

          <FormSection title={t('form.petInfo')}>
            <TextField
              name="name"
              value={form.name}
              onChange={handleChange}
              label={t('form.name')}
              optionalLabel={t('form.optional')}
              placeholder={t('form.namePh')}
            />
            <TextField
              name="breed"
              value={form.breed}
              onChange={handleChange}
              label={t('form.breed')}
              placeholder={t('form.breedPh')}
              required
            />
            <TextField
              name="color"
              value={form.color}
              onChange={handleChange}
              label={t('form.color')}
              placeholder={t('form.colorPh')}
              required
            />
          </FormSection>

          <FormSection title={t('form.locationContact')}>
            <TextField
              name="area"
              value={form.area}
              onChange={handleChange}
              label={t('form.area')}
              placeholder={t('form.areaPh')}
              required
            />
            <TextField
              name="contact"
              value={form.contact}
              onChange={handleChange}
              label={t('form.contact')}
              placeholder={t('form.contactPh')}
              required
            />
          </FormSection>

          <FormSection title={t('form.details')}>
            <TextAreaField
              name="description"
              value={form.description}
              onChange={handleChange}
              label={t('form.desc')}
              placeholder={t('form.descPh')}
            />
          </FormSection>

          <ErrorBanner message={error} />

          <SubmitButton busy={saving} label={t('form.save')} busyLabel={t('form.saving')} />
        </form>
      )}
    </div>
  );
}
