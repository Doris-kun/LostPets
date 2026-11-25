import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Mã xác nhận của từng tin.
 *
 * Back-end sinh mã này một lần duy nhất lúc đăng tin, và chỉ lưu bản BĂM.
 * Không endpoint nào đọc lại được — mất mã là mất quyền sửa/xoá tin đó.
 * Nên app phải tự cất mã ngay khi nhận được.
 *
 * Bản web dùng localStorage (front-end-react/src/claim.js). React Native không
 * có localStorage, dùng AsyncStorage — khác ở chỗ mọi thao tác đều BẤT ĐỒNG BỘ,
 * phải await.
 *
 * Tin tạo từ máy khác, hoặc tin cũ đăng trước khi có tính năng này, sẽ không có
 * mã trong máy. Back-end cho qua với tin không có mã, còn tin có mã thì trả 403.
 */

const key = (id: string) => `claim:${id}`;

export default {
  async save(id: string, code: string): Promise<void> {
    if (!id || !code) return;
    try {
      await AsyncStorage.setItem(key(id), code);
    } catch {
      // Hết dung lượng hoặc lỗi hệ thống. Không chặn luồng đăng tin,
      // nhưng người dùng sẽ cần nhập tay mã khi muốn sửa/xoá.
    }
  },

  async get(id: string): Promise<string> {
    try {
      return (await AsyncStorage.getItem(key(id))) || '';
    } catch {
      return '';
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key(id));
    } catch {
      // Không sao, mã thừa nằm lại cũng vô hại.
    }
  },

  /*
   * Danh sách id của mọi tin MÁY NÀY đã đăng.
   *
   * Dùng cho dải hỏi "tìm được chưa?": app phải biết tin nào là của người
   * đang cầm máy mới hỏi đúng người. Không có tài khoản cũng hỏi được, vì
   * quyền sở hữu ở đây là "giữ mã xác nhận", không phải "đã đăng nhập".
   *
   * Lọc theo tiền tố thay vì giữ thêm một danh sách riêng: hai nguồn sự thật
   * thì sớm muộn cũng lệch nhau, mà lệch kiểu đó không ai nhận ra.
   */
  async list(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter((k) => k.startsWith('claim:')).map((k) => k.slice('claim:'.length));
    } catch {
      return [];
    }
  },
};
