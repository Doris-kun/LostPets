import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Sổ ghi "đã hỏi tin này chưa, bao giờ được hỏi lại".
 *
 * Vì sao cần: nút "Đã đoàn tụ" nằm im không phải vì nó khó bấm, mà vì người
 * ta đoàn tụ xong là quên app này tồn tại. Cuộc đoàn tụ diễn ra NGOÀI ĐỜI —
 * không có dữ liệu nào trong hệ thống đổi khi con vật về nhà, nên app không
 * đoán được, chỉ hỏi được. Chỗ này giữ nhịp hỏi sao cho không thành phiền.
 *
 * Và đó cũng là con số của Objective 4: tỉ lệ tin được đánh dấu đoàn tụ là
 * bằng chứng app có tác dụng thật. Tin tìm được mà không ai bấm nút thì số
 * liệu trong báo cáo thấp một cách sai sự thật.
 *
 * Tất cả nằm trong bộ nhớ của chính máy người đăng, không gửi đi đâu cả.
 * Bản web là front-end/src/nudge.js, cùng mốc thời gian, chỉ khác chỗ
 * AsyncStorage phải await còn localStorage thì không.
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const SCAN_KEY = 'nudge:scan';
const askKey = (id: string) => `nudge:ask:${id}`;

/*
 * Hỏng thì coi như "chưa hẹn gì", tức là ĐƯỢC PHÉP hỏi.
 *
 * Thà hỏi thừa một lần còn hơn im lặng vĩnh viễn vì một lần đọc ổ đĩa hỏng.
 */
const readAt = async (key: string): Promise<number> => {
  try {
    return Number(await AsyncStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

const writeAt = async (key: string, at: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, String(at));
  } catch {
    /* không ghi được thì thôi, lần sau hỏi lại */
  }
};

export default {
  /*
   * Mỗi lần dò là vài lượt gọi máy chủ, mà tin chỉ cũ đi theo NGÀY chứ không
   * theo phút. Dò lại sau 12 tiếng là quá đủ.
   */
  async dueForScan(): Promise<boolean> {
    return Date.now() >= (await readAt(SCAN_KEY));
  },

  async markScanned(): Promise<void> {
    await writeAt(SCAN_KEY, Date.now() + 12 * HOUR);
  },

  async mayAsk(id: string): Promise<boolean> {
    return Date.now() >= (await readAt(askKey(id)));
  },

  async snooze(id: string, days: number): Promise<void> {
    await writeAt(askKey(id), Date.now() + days * DAY);
  },

  async forget(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(askKey(id));
    } catch {
      /* không sao */
    }
  },
};
