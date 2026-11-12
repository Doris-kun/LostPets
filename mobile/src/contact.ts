/*
 * Địa chỉ liên hệ công khai.
 *
 * PHẢI TRÙNG với CONTACT_EMAIL trong front-end/src/contact.js. Hai địa chỉ
 * khác nhau nghĩa là cùng một dịch vụ mà hứa hai đường liên hệ khác nhau —
 * người dùng gửi vào đường nào cũng có thể rơi vào chỗ không ai đọc.
 *
 * Để riêng một file thay vì nằm trong màn hình nào đó: hai màn cùng cần nó —
 * màn Liên hệ chìa địa chỉ ra, màn Chính sách bảo mật dẫn sang màn Liên hệ và
 * tự ẩn mục đó đi khi địa chỉ bỏ trống. Chép làm hai bản thì sớm muộn sửa một
 * nơi quên nơi kia, mà lệch kiểu đó không ai nhận ra cho tới lúc có người gửi
 * thư vào hộp đã bỏ. Bản web làm y vậy ở PR #73.
 *
 * Bỏ trống thì màn Liên hệ chỉ còn thẻ trợ lý, không vẽ thẻ email — thà thiếu
 * một kênh còn hơn chìa ra một nút bấm vào không gửi đi đâu.
 *
 * Mục 10 của chính sách hứa "yêu cầu xoá tài khoản bằng cách liên hệ", nên bỏ
 * trống là chính sách hứa một thứ không thực hiện được. Meta cũng bắt buộc có
 * chỗ liên hệ mới duyệt ứng dụng.
 */
export const CONTACT_EMAIL = 'supportlostpets@gmail.com';
