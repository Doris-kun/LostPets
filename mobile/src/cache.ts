import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet } from './types';

/*
 * Nhớ tạm trang đầu của danh sách tin.
 *
 * VÌ SAO CẦN
 *
 * Máy chủ chạy trên Render bản miễn phí, và bản đó NGỦ sau 15 phút không ai
 * gọi. Lượt gọi đầu tiên sau khi ngủ phải chờ máy chủ thức dậy — có khi 30
 * giây. Trong lúc đó app chỉ có một vòng xoay trên nền trắng, nên người dùng
 * ngồi nhìn một màn hình trống và kết luận app hỏng.
 *
 * Nhớ lại danh sách lần trước thì mở app ra là có ngay cái để đọc, còn lượt
 * gọi máy chủ chạy ngầm phía sau. Chờ bao lâu cũng không còn là màn hình
 * trống nữa.
 *
 * CHỈ NHỚ DANH SÁCH MẶC ĐỊNH
 *
 * Không nhớ theo từng bộ lọc hay từng câu tìm kiếm. Hai lý do:
 *
 *   1. Số tổ hợp lọc gần như vô hạn, nhớ hết thì ổ đĩa phình ra mà phần lớn
 *      không bao giờ dùng lại.
 *   2. Kết quả lọc cũ hiện ra dưới một bộ lọc vừa đổi thì SAI, không phải
 *      chậm — người dùng tưởng bộ lọc không ăn.
 *
 * Mở app lên là lúc duy nhất chắc chắn không có lọc, không có tìm kiếm. Đó
 * cũng đúng là lúc đau nhất.
 */

const KEY = 'cache:pets';

/*
 * Quá hạn này thì coi như không có.
 *
 * Danh sách cũ một ngày thì gần như chắc chắn còn gần đúng. Cũ một tuần thì
 * có thể đầy tin đã đoàn tụ — hiện ra rồi mới lặng lẽ biến mất lúc làm mới
 * xong, nhìn như app bị lỗi. Thà chờ lượt gọi thật còn hơn.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/*
 * Nhớ tối đa chừng này tin.
 *
 * Trang đầu vốn chỉ chừng 10 tin, nhưng người dùng cuộn xuống là danh sách
 * nối dài ra. Nhớ cả trăm tin kèm mô tả thì mỗi lần ghi là một chuỗi JSON
 * vài trăm KB, mà mở app ra cũng chỉ nhìn được chừng ấy tin đầu.
 */
const MAX_PETS = 12;

interface Saved {
  pets: Pet[];
  total: number;
  savedAt: number;
}

/*
 * Đọc danh sách đã nhớ. Trả null khi chưa có, đã quá hạn, hoặc dữ liệu hỏng.
 *
 * KHÔNG bao giờ ném lỗi: đây là đường tăng tốc, không phải đường chính. Nhớ
 * tạm hỏng thì app chỉ việc chờ máy chủ như trước, chứ không được phép làm
 * sập màn hình.
 */
export async function readPets(): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    const { pets, total, savedAt } = data as Partial<Saved>;

    // Kiểm từng trường: bản app cũ có thể đã ghi kiểu khác, và tin bừa thì
    // màn hình đầy undefined.
    if (!Array.isArray(pets) || typeof total !== 'number' || typeof savedAt !== 'number') {
      return null;
    }
    if (Date.now() - savedAt > MAX_AGE_MS) return null;

    return { pets, total, savedAt };
  } catch {
    return null;
  }
}

/** Ghi lại trang đầu. Nuốt mọi lỗi, xem giải thích ở readPets. */
export async function savePets(pets: Pet[], total: number): Promise<void> {
  try {
    const data: Saved = { pets: pets.slice(0, MAX_PETS), total, savedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* hết chỗ hoặc ổ đĩa lỗi thì thôi, lần sau ghi lại */
  }
}

/*
 * Xoá danh sách đã nhớ.
 *
 * Gọi khi đăng xuất: danh sách công khai thì ai xem cũng được, nhưng máy này
 * vừa đổi người dùng mà vẫn hiện nguyên màn hình của người trước thì trông
 * như chưa đăng xuất xong.
 */
export async function clearPets(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* không xoá được thì thôi, nó cũng tự quá hạn sau một ngày */
  }
}
