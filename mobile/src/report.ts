import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Nhớ những tin MÁY NÀY đã báo cáo, để nút đổi thành "Đã báo cáo" thay vì cho
 * bấm đi bấm lại mãi.
 *
 * Đây là MA SÁT chống bấm bừa, KHÔNG phải bảo mật: xoá dữ liệu app là báo cáo
 * lại được. Muốn chặn thật thì phải biết ai gửi, mà báo cáo lại CỐ Ý không bắt
 * đăng nhập — người cần báo cáo nhất chính là người không có tài khoản: họ
 * không đăng tin nào cả, chỉ bị kẻ khác lấy số điện thoại đem đi đăng tin giả.
 * Bắt đăng nhập mới cho báo cáo là chặn đúng người cần báo cáo nhất.
 *
 * Phần chặn thật nằm ở bộ đếm tần suất theo IP phía server (reportLimit trong
 * back-end/api/routes/petRoutes.js).
 *
 * Bản web là front-end/src/report.js, dùng localStorage nên đọc ra kết quả
 * ngay. AsyncStorage của React Native phải chờ, nên bên này mọi hàm đều bất
 * đồng bộ — giống hệt [claim.ts] đang làm với mã xác nhận.
 */

const key = (id: string) => `report:${id}`;

export default {
  async has(id: string): Promise<boolean> {
    if (!id) return false;
    try {
      return (await AsyncStorage.getItem(key(id))) !== null;
    } catch {
      // Đọc không được thì coi như chưa báo cáo. Cho bấm thừa một lần còn hơn
      // khoá mất đường tố cáo của người ta.
      return false;
    }
  },

  async mark(id: string): Promise<void> {
    if (!id) return;
    try {
      // Lưu luôn thời điểm thay vì chỉ lưu "có". Chưa dùng tới, nhưng sau này
      // muốn cho báo cáo lại sau vài tháng thì đã có sẵn mốc để tính.
      await AsyncStorage.setItem(key(id), String(Date.now()));
    } catch {
      /* không lưu được thì thôi, lần sau hỏi lại */
    }
  },
};
