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

const key = (id) => `claim:${id}`;

export default {
  async save(id, code) {
    if (!id || !code) return;
    try {
      await AsyncStorage.setItem(key(id), code);
    } catch {
      // Hết dung lượng hoặc lỗi hệ thống. Không chặn luồng đăng tin,
      // nhưng người dùng sẽ cần nhập tay mã khi muốn sửa/xoá.
    }
  },

  async get(id) {
    try {
      return (await AsyncStorage.getItem(key(id))) || '';
    } catch {
      return '';
    }
  },

  async remove(id) {
    try {
      await AsyncStorage.removeItem(key(id));
    } catch {
      // Không sao, mã thừa nằm lại cũng vô hại.
    }
  },
};
