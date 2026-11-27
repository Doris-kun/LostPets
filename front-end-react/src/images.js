// Xin Cloudinary trả ảnh đúng cỡ cần hiển thị, thay vì tải ảnh gốc rồi để
// trình duyệt thu nhỏ.
//
// Đo trên một ảnh thật đang nằm trong dữ liệu:
//
//   ảnh gốc                      92.540 byte
//   w_192,q_auto,f_auto           1.996 byte     nhẹ hơn 46 lần
//
// q_auto để Cloudinary tự chọn mức nén, f_auto để nó tự chọn định dạng theo
// trình duyệt người xem (AVIF, WebP hay JPEG).
//
// CHỈ ĐỔI LÚC HIỂN THỊ. Không bao giờ ghi địa chỉ đã biến đổi vào database:
// publicIdFromUrl trong back-end bóc mã ảnh bằng cách cắt chuỗi sau /upload/,
// gặp w_192,... là nó moi ra sai mã, và lệnh xoá ảnh sẽ trượt — ảnh nằm lại
// Cloudinary vĩnh viễn dù tin đã bị xoá.
//
// Hiện back-end không cho sửa trường image qua API (nó không nằm trong
// EDITABLE_FIELDS) nên chuyện đó không xảy ra được. Nhưng vẫn ghi ra đây,
// vì hàng rào ấy có thể bị gỡ mà người gỡ không biết nó đang chặn cái gì.

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/**
 * Trả về địa chỉ ảnh đã thu nhỏ về `width` pixel.
 *
 * Địa chỉ không phải của Cloudinary thì trả nguyên si — ảnh mẫu đang nằm trên
 * cataas.com và placedog.net, không biến đổi được, và cố chèn tham số vào chỉ
 * làm hỏng địa chỉ.
 */
export function sized(url, width) {
  if (!url || !CLOUDINARY.test(url) || !Number.isFinite(width)) return url;
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
}

export default { sized };
