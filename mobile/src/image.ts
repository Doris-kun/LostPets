/*
 * Xin Cloudinary gửi bản ảnh vừa đúng chỗ cần vẽ, thay vì ảnh gốc.
 *
 * Vì sao cần: thẻ tin vẽ ảnh ở 96x96 điểm, mà app đang tải về ảnh gốc. Đo
 * thật một tin trong dữ liệu đang chạy:
 *
 *   ảnh gốc                          92.5 KB
 *   cùng ảnh đó, nhờ thu nhỏ 192px    3.8 KB
 *
 * Nặng gấp 24 lần mức cần. Một trang 10 tin là 925 KB thay vì 38 KB — trên
 * 4G yếu thì đó là khác biệt giữa "ảnh hiện ngay" và "chờ mãi mới thấy".
 *
 * Cloudinary làm việc thu nhỏ đó miễn phí, chỉ cần chèn thêm một đoạn vào
 * giữa địa chỉ:
 *
 *   .../upload/v1793377211/lost-pets/abc.webp
 *   .../upload/w_192,q_auto,f_auto/v1793377211/lost-pets/abc.webp
 *
 *   w_192   bề ngang 192 điểm ảnh, cao tự tính theo tỉ lệ
 *   q_auto  Cloudinary tự chọn mức nén vừa đủ để mắt không thấy khác
 *   f_auto  tự chọn định dạng máy đang xem đọc được tốt nhất
 *
 * -----------------------------------------------------------------------
 * TUYỆT ĐỐI KHÔNG LƯU ĐỊA CHỈ ĐÃ BIẾN ĐỔI VÀO DATABASE
 *
 * Hàm này chỉ chạy ngay lúc vẽ. Trường `image` trong database phải giữ
 * nguyên địa chỉ gốc.
 *
 * Lý do: back-end/api/lib/images.js có hàm publicIdFromUrl, moi mã ảnh ra
 * từ địa chỉ để xoá ảnh trên Cloudinary khi tin bị xoá. Biểu thức của nó
 * chỉ đúng với địa chỉ KHÔNG kèm biến đổi — chính Nam đã ghi chú điều đó
 * ngay tại chỗ. Đối chiếu thử với một địa chỉ có w_192 thì nó moi ra sai
 * mã, lệnh xoá trượt, và ảnh nằm lại trên Cloudinary vĩnh viễn.
 */

// Đoạn này có trong mọi địa chỉ ảnh Cloudinary, và phần chèn thêm phải nằm
// ngay sau nó.
const UPLOAD = '/image/upload/';

/*
 * Nhận ra địa chỉ đã có sẵn phần biến đổi, để không chèn chồng lên.
 *
 * Mọi lệnh biến đổi của Cloudinary đều dạng một hai chữ cái rồi tới gạch
 * dưới: w_192, h_100, c_fill, q_auto. Nhiều lệnh thì ngăn bằng dấu phẩy.
 * Còn đoạn đầu của địa chỉ bình thường là v<số> hoặc tên thư mục, không bao
 * giờ có dạng đó.
 */
const alreadyTransformed = (segment: string): boolean =>
  /^[a-z]{1,2}_/.test(segment) || segment.includes(',');

/**
 * Trả về địa chỉ ảnh đã thu nhỏ cho đúng bề ngang cần vẽ.
 *
 * Địa chỉ không phải của Cloudinary thì trả nguyên si — ảnh demo đang để ở
 * cataas.com và placedog.net, mình không có quyền bảo họ thu nhỏ.
 *
 * @param url   địa chỉ ảnh lấy từ back-end
 * @param width bề ngang cần, tính bằng điểm ảnh thật
 */
export function thumbnail(url: string | undefined | null, width: number): string {
  if (!url) return '';

  const at = url.indexOf(UPLOAD);
  // Không phải ảnh Cloudinary -> trả nguyên si, đừng chạm vào.
  if (at < 0 || !url.includes('res.cloudinary.com')) return url;

  const after = url.slice(at + UPLOAD.length);
  const firstSegment = after.split('/')[0] ?? '';
  if (alreadyTransformed(firstSegment)) return url;

  return `${url.slice(0, at + UPLOAD.length)}w_${width},q_auto,f_auto/${after}`;
}

/*
 * Bề ngang xin về cho từng chỗ, nhân đôi so với kích thước vẽ ra.
 *
 * Nhân đôi vì màn hình điện thoại có mật độ điểm ảnh gấp 2-3 lần: một ô
 * "96 điểm" trên iPhone là 192 hoặc 288 điểm ảnh thật. Xin đúng 96 thì ảnh
 * nhìn nhoè.
 *
 * Không nhân ba: chênh lệch giữa 2x và 3x gần như không thấy được trên một
 * thẻ nhỏ, mà dung lượng thì tăng hơn gấp đôi.
 */
export const THUMB_CARD = 192; // thẻ tin trong danh sách, vẽ ở 96
export const THUMB_FEATURED = 800; // thẻ nổi bật, rộng gần hết màn hình
