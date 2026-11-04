import { AxiosError } from 'axios';
import { errorStatus } from '../api';
import { timeAgo } from '../components/PetCard';
import { countActiveFilters, EMPTY_FILTERS } from '../components/PetFilters';
import { buildParams } from '../screens/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import report from '../report';
import { words, type WordKey } from '../word';
import type { Filters } from '../types';

/*
 * Các hàm thuần trong app — không vẽ gì, chỉ nhận vào và trả ra.
 *
 * Đây là loại hàm dễ test nhất mà cũng hay sai nhất, vì chúng toàn những
 * đường ranh giới: "dưới 60 phút" hay "từ 60 phút", "đếm cái này có tính
 * không". Sai một đường ranh thì không ai thấy ngay, chỉ là thỉnh thoảng
 * hiện ra một con số lạ.
 */

// Bản t() thật, đọc đúng kho chữ, chỉ bỏ phần hook đi.
const lamT =
  (lang: 'vi' | 'en') =>
  (key: WordKey, params?: Record<string, string | number>) => {
    let text: string = words[lang][key] ?? key;
    if (params) {
      for (const [ten, giaTri] of Object.entries(params)) {
        text = text.replaceAll(`{${ten}}`, String(giaTri));
      }
    }
    return text;
  };

const t = lamT('vi');

describe('timeAgo — các đường ranh giới', () => {
  // Chốt đồng hồ lại. Không chốt thì test chạy lúc nửa đêm sẽ cho kết quả
  // khác lúc giữa trưa, và hỏng một cách ngẫu nhiên.
  const BAY_GIO = new Date('2026-06-15T12:00:00Z').getTime();

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(BAY_GIO);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const truoc = (mili: number) => new Date(BAY_GIO - mili).toISOString();

  const GIAY = 1000;
  const PHUT = 60 * GIAY;
  const GIO = 60 * PHUT;
  const NGAY = 24 * GIO;

  it('chưa tới một phút thì ghi "Vừa xong"', () => {
    expect(timeAgo(truoc(0), t, 'vi')).toBe('Vừa xong');
    expect(timeAgo(truoc(59 * GIAY), t, 'vi')).toBe('Vừa xong');
  });

  it('đúng một phút thì chuyển sang đếm phút', () => {
    expect(timeAgo(truoc(PHUT), t, 'vi')).toBe('1 phút trước');
  });

  it('59 phút vẫn là phút, 60 phút thành giờ', () => {
    expect(timeAgo(truoc(59 * PHUT), t, 'vi')).toBe('59 phút trước');
    expect(timeAgo(truoc(60 * PHUT), t, 'vi')).toBe('1 giờ trước');
  });

  it('23 giờ vẫn là giờ, 24 giờ thành ngày', () => {
    expect(timeAgo(truoc(23 * GIO), t, 'vi')).toBe('23 giờ trước');
    expect(timeAgo(truoc(24 * GIO), t, 'vi')).toBe('1 ngày trước');
  });

  it('29 ngày vẫn đếm ngày, 30 ngày thì quay về ngày tháng', () => {
    expect(timeAgo(truoc(29 * NGAY), t, 'vi')).toBe('29 ngày trước');
    // Quá 30 ngày thì "45 ngày trước" không còn nghĩa gì với người đọc,
    // nên hiện ngày tháng thật.
    expect(timeAgo(truoc(30 * NGAY), t, 'vi')).not.toContain('ngày trước');
  });

  it('tháng viết tắt đổi theo ngôn ngữ', () => {
    const cu = truoc(60 * NGAY);
    const vi = timeAgo(cu, t, 'vi');
    const en = timeAgo(cu, lamT('en'), 'en');
    // Cùng một mốc thời gian nhưng hai thứ tiếng phải ra hai cách viết khác
    // nhau — "16 thg 4" so với "Apr 16".
    expect(vi).not.toBe(en);
  });

  it('bản tiếng Anh dùng đúng kho chữ tiếng Anh', () => {
    expect(timeAgo(truoc(5 * PHUT), lamT('en'), 'en')).toBe('5 min ago');
  });
});

describe('countActiveFilters — đếm số điều kiện lọc đang bật', () => {
  const loc = (p: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...p });

  it('mặc định thì không có điều kiện nào', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('"newest" là mặc định nên KHÔNG tính là một điều kiện', () => {
    // Nếu tính thì huy hiệu trên nút Lọc lúc nào cũng hiện số 1, người dùng
    // tưởng mình đang lọc cái gì đó mà không biết là cái gì.
    expect(countActiveFilters(loc({ sort: 'newest' }))).toBe(0);
    expect(countActiveFilters(loc({ sort: 'oldest' }))).toBe(1);
  });

  it('khu vực chỉ toàn khoảng trắng thì không tính', () => {
    expect(countActiveFilters(loc({ area: '   ' }))).toBe(0);
    expect(countActiveFilters(loc({ area: 'Quận 1' }))).toBe(1);
  });

  it('cộng dồn được', () => {
    expect(countActiveFilters(loc({ species: 'Chó', area: 'Quận 1', days: '7' }))).toBe(3);
    expect(
      countActiveFilters({ species: 'Mèo', area: 'Thủ Đức', days: '30', sort: 'oldest' }),
    ).toBe(4);
  });
});

describe('errorStatus — lấy mã HTTP ra từ một lỗi bắt được', () => {
  /*
   * TypeScript khai biến trong catch là unknown, đúng — JavaScript ném được
   * bất cứ thứ gì, kể cả một chuỗi. Nên err.response?.status là đọc mò.
   */
  it('lấy được mã từ lỗi của axios', () => {
    const err = new AxiosError('hỏng');
    // @ts-expect-error — dựng lỗi giả, không cần đủ mọi trường của axios
    err.response = { status: 413 };
    expect(errorStatus(err)).toBe(413);
  });

  it('lỗi mạng của axios thì không có mã, trả undefined', () => {
    // Đây là trường hợp "không gọi tới được máy chủ" — khác hẳn với máy chủ
    // trả về lỗi. Hai thứ này phải báo cho người dùng bằng hai câu khác nhau.
    expect(errorStatus(new AxiosError('Network Error'))).toBeUndefined();
  });

  it('lỗi thường không phải của axios thì cũng không ném', () => {
    expect(errorStatus(new Error('gì đó'))).toBeUndefined();
    expect(errorStatus('một chuỗi')).toBeUndefined();
    expect(errorStatus(null)).toBeUndefined();
    expect(errorStatus(undefined)).toBeUndefined();
  });
});

/*
 * Trí nhớ "tin này đã báo cáo rồi".
 *
 * Test ở đây chứ không ở source.test.ts vì nó có hành vi thật để chạy, chỉ
 * là phải mượn bản giả của AsyncStorage trong jest.setup.ts — máy thật mới
 * có ổ đĩa, Node thì không.
 */
describe('report — nhớ tin đã báo cáo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('chưa báo cáo thì trả về false', async () => {
    await expect(report.has('abc')).resolves.toBe(false);
  });

  it('đánh dấu rồi thì nhớ', async () => {
    await report.mark('abc');
    await expect(report.has('abc')).resolves.toBe(true);
  });

  it('mỗi tin một chỗ nhớ riêng, không lẫn sang tin khác', async () => {
    await report.mark('abc');
    await expect(report.has('xyz')).resolves.toBe(false);
  });

  // Không id thì đừng ghi gì cả. Ghi vào khoá "report:" trống sẽ làm MỌI tin
  // chưa có id đều thành "đã báo cáo".
  it('id rỗng thì không ghi và không nhận nhầm', async () => {
    await report.mark('');
    await expect(report.has('')).resolves.toBe(false);
  });

  it('lưu kèm mốc thời gian chứ không chỉ lưu cờ có/không', async () => {
    await report.mark('abc');
    const luu = await AsyncStorage.getItem('report:abc');
    expect(Number(luu)).toBeGreaterThan(0);
  });
});

/*
 * Dựng tham số gửi lên máy chủ.
 *
 * Chỗ này toàn những đường ranh giới dễ sai mà sai thì không ai thấy ngay:
 * gửi thừa một tham số rỗng là back-end dựng biểu thức lọc rỗng và trả về
 * sai, mà nhìn danh sách thì vẫn ra một đống tin trông bình thường.
 */
describe('buildParams — tham số gửi lên máy chủ', () => {
  const loc = EMPTY_FILTERS;

  it('không lọc gì thì chỉ gửi ba tham số bắt buộc', () => {
    // Kiểm đúng ý định: không có tham số rỗng nào lọt qua. Không ghim số
    // tin mỗi trang, vì đổi số đó là chuyện bình thường chứ không phải lỗi.
    expect(Object.keys(buildParams('', loc, 0, '')).sort()).toEqual(['limit', 'skip', 'sort']);
  });

  it('câu tìm kiếm rỗng thì không gửi q', () => {
    expect(buildParams('', loc, 0, '   ')).not.toHaveProperty('q');
  });

  it('cắt khoảng trắng thừa quanh câu tìm kiếm', () => {
    expect(buildParams('', loc, 0, '  chó vàng  ').q).toBe('chó vàng');
  });

  it('giữ nguyên dấu tiếng Việt, không bỏ dấu', () => {
    expect(buildParams('', loc, 0, 'mèo mướp').q).toBe('mèo mướp');
  });

  // skip là số tin bỏ qua, dùng để tải trang sau. Truyền nhầm số trang
  // thay vì số tin thì trang 2 trả về gần hệt trang 1.
  it('skip đi thẳng vào tham số, không nhân chia gì', () => {
    expect(buildParams('', loc, 27, '').skip).toBe(27);
  });

  it('lọc và tìm kiếm dùng được cùng lúc', () => {
    const p = buildParams('lost', { ...loc, species: 'Chó', area: ' Quận 7 ' }, 0, 'vàng');
    expect(p).toMatchObject({ type: 'lost', species: 'Chó', area: 'Quận 7', q: 'vàng' });
  });
});
