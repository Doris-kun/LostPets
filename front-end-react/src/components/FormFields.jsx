/*
 * Các mảnh giao diện dùng chung cho form đăng tin và form sửa tin.
 *
 * Bên Vue, NewPet.vue và EditPet.vue chép gần như y hệt nhau: cùng khối bọc,
 * cùng kiểu nút chọn, cùng ô nhập chữ lặp 5 lần mỗi file. Sửa bo góc hay màu
 * viền là phải nhớ sửa cả hai nơi, và thực tế hai file đã lệch nhau sẵn
 * (NewPet có shadow-sm ở nút đang chọn, EditPet thì không).
 *
 * Gom về một chỗ để đổi một lần là cả hai form cùng đổi.
 */

// Khối trắng bo góc, gom các trường cùng nhóm.
export function FormSection({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

/*
 * Nút chọn một trong hai (Bị mất/Tìm thấy, Chó/Mèo).
 *
 * type="button" là bắt buộc: mặc định <button> nằm trong <form> có
 * type="submit", thiếu nó thì bấm chọn "Bị mất" sẽ gửi luôn form.
 */
export function ChoiceButton({ active, onClick, activeClass, hoverClass, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
        active ? activeClass : `bg-white text-gray-500 border-gray-200 ${hoverClass}`
      }`}
    >
      {children}
    </button>
  );
}

/*
 * Một ô nhập chữ kèm nhãn.
 *
 * `name` phải trùng tên trường trong form state — nhờ vậy cả 5 ô dùng chung
 * một hàm onChange, thay vì viết 5 hàm riêng.
 */
export function TextField({ name, value, onChange, label, optionalLabel, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {optionalLabel && <span className="text-gray-400 font-normal text-xs"> {optionalLabel}</span>}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
      />
    </div>
  );
}

// Ô nhập nhiều dòng cho phần mô tả.
export function TextAreaField({ name, value, onChange, label, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows="3"
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none transition"
      />
    </div>
  );
}

// Dải báo lỗi đỏ nằm trên nút gửi.
export function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </div>
  );
}

// Nút gửi form, chiếm trọn chiều ngang.
export function SubmitButton({ busy, label, busyLabel }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-lg"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
