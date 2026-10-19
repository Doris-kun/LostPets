import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
 * Form đăng tin mới.
 *
 * Dịch từ Vue: views/NewPet.vue
 *
 * Đây là trang duy nhất gửi FILE lên server, nên gửi dạng multipart/form-data
 * thay vì JSON — xem CONTRIBUTING mục 5, phần POST /pets.
 */

const EMPTY_FORM = {
  type: 'lost',
  name: '',
  species: '',
  breed: '',
  color: '',
  area: '',
  contact: '',
  description: '',
};

export default function NewPet() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  /*
   * Vue: 8 trường nằm trong form{} và mỗi input tự nối bằng v-model.
   * React: giữ nguyên 1 object, nhưng phải tự viết hàm cập nhật.
   * Mẹo: đặt name cho input trùng tên trường -> dùng chung một handleChange
   * cho cả 8 input, khỏi viết 8 hàm riêng.
   */
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSpeciesError, setShowSpeciesError] = useState(false);

  /*
   * Tạo URL xem trước cho ảnh vừa chọn, và THU HỒI nó khi không dùng nữa.
   *
   * URL.createObjectURL() giữ nguyên file trong bộ nhớ trình duyệt cho tới khi
   * được revoke. Bản Vue chỉ gọi createObjectURL mà không bao giờ revoke, nên
   * chọn đi chọn lại 10 tấm ảnh là 10 tấm nằm lì trong RAM.
   *
   * Hàm return của useEffect chạy khi ảnh đổi hoặc rời trang -> dọn đúng lúc.
   */
  useEffect(() => {
    if (!imageFile) {
      setPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) setImageFile(file);
  };

  const handleSubmit = async (event) => {
    // Vue: @submit.prevent  ->  React: tự gọi preventDefault()
    // Thiếu dòng này trình duyệt sẽ tải lại trang và mất hết dữ liệu đã nhập.
    event.preventDefault();

    // `required` của HTML lo các ô chữ, nhưng loài chọn bằng nút bấm nên
    // trình duyệt không kiểm tra được -> phải tự kiểm.
    if (!form.species) {
      setShowSpeciesError(true);
      return;
    }

    setShowSpeciesError(false);
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (imageFile) formData.append('image', imageFile);

      // Không tự đặt header Content-Type: axios phải tự sinh kèm 'boundary',
      // đặt tay vào là server không tách được file ra khỏi các trường chữ.
      await api.createPet(formData);

      showToast(t('new.success'));
      navigate('/');
    } catch {
      setError(t('form.error'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          {t('new.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{t('new.title')}</h1>
        <p className="text-sm text-gray-400 mt-1">{t('new.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title={t('form.general')}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('form.status')}
            </label>
            <div className="flex gap-3">
              {/*
                type="button" là bắt buộc. Mặc định <button> trong <form> có
                type="submit" -> bấm chọn "Bị mất" sẽ gửi luôn form.
              */}
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
              {/* Giá trị 'Chó'/'Mèo' phải khớp dữ liệu trong database, không dịch */}
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
            {showSpeciesError && (
              <p className="text-xs text-rose-500 mt-1.5">{t('form.speciesError')}</p>
            )}
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('form.photo')}{' '}
              <span className="text-gray-400 font-normal text-xs">{t('form.optional')}</span>
            </label>

            {/*
              Vue: <div @click="$refs.fileInput.click()"> — phải giữ ref rồi bấm hộ.
              React: bọc bằng <label>, trình duyệt tự mở hộp chọn file khi bấm
              vào bất kỳ đâu trong label. Không cần ref, và quan trọng hơn:
              dùng được bằng bàn phím (Tab + Enter), bản Vue thì không.
            */}
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-all">
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="mx-auto max-h-52 rounded-xl object-cover mb-3"
                />
              ) : (
                <div className="py-4">
                  <svg
                    className="w-10 h-10 text-gray-300 mx-auto mb-2"
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
                  <p className="text-sm text-gray-400">{t('form.photoUpload')}</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
        </FormSection>

        <ErrorBanner message={error} />

        <SubmitButton busy={loading} label={t('form.submit')} busyLabel={t('form.submitting')} />
      </form>
    </div>
  );
}
