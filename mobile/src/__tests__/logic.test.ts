import { AxiosError } from 'axios';
import { errorStatus } from '../api';
import { timeAgo } from '../components/PetCard';
import { countActiveFilters, EMPTY_FILTERS } from '../components/PetFilters';
import { buildParams } from '../screens/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import report from '../report';
import nudge from '../nudge';
import claim from '../claim';
import { THUMB_CARD, thumbnail } from '../image';
import { getPushToken, readTarget } from '../notify';
import { clearPets, readPets, savePets } from '../cache';
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

/*
 * Thu nhỏ ảnh trước khi tải về.
 *
 * Test kỹ chỗ này vì nó sửa địa chỉ ảnh bằng cách cắt ghép chuỗi — sai một
 * nhịp là ảnh không hiện, mà lỗi đó không làm app chết nên không ai thấy
 * ngay, chỉ là tự nhiên vài thẻ tin trống trơn.
 */
describe('thumbnail — xin Cloudinary thu nhỏ ảnh', () => {
  const goc = 'https://res.cloudinary.com/dvwhgytiw/image/upload/v1793377211/lost-pets/abc.webp';

  it('chèn lệnh thu nhỏ vào ngay sau /upload/', () => {
    expect(thumbnail(goc, 192)).toBe(
      'https://res.cloudinary.com/dvwhgytiw/image/upload/w_192,q_auto,f_auto/v1793377211/lost-pets/abc.webp',
    );
  });

  // Phần sau /upload/ chính là mã ảnh mà back-end dùng để xoá ảnh trên
  // Cloudinary. Cắt sai một ký tự là tin xoá rồi mà ảnh nằm lại mãi.
  it('giữ nguyên si phần đuôi chứa mã ảnh', () => {
    expect(thumbnail(goc, 192)).toContain('/v1793377211/lost-pets/abc.webp');
  });

  it('bề ngang truyền vào bao nhiêu thì xin bấy nhiêu', () => {
    expect(thumbnail(goc, 800)).toContain('w_800,');
    expect(thumbnail(goc, THUMB_CARD)).toContain(`w_${THUMB_CARD},`);
  });

  // Ảnh demo nằm ở máy chủ người khác, mình không có quyền bảo họ thu nhỏ.
  // Chèn bừa vào là địa chỉ hỏng và ảnh biến mất hẳn.
  it('địa chỉ không phải Cloudinary thì trả nguyên si', () => {
    expect(thumbnail('https://cataas.com/cat/0w0AIO9', 192)).toBe('https://cataas.com/cat/0w0AIO9');
    expect(thumbnail('https://placedog.net/600/400?id=11', 192)).toBe(
      'https://placedog.net/600/400?id=11',
    );
  });

  it('đã có sẵn lệnh biến đổi thì không chèn chồng lên', () => {
    const da = thumbnail(goc, 192);
    expect(thumbnail(da, 192)).toBe(da);
  });

  // API trả image là CHUỖI RỖNG khi tin không có ảnh, không phải null.
  it('không có ảnh thì trả chuỗi rỗng, không trả undefined', () => {
    expect(thumbnail('', 192)).toBe('');
    expect(thumbnail(undefined, 192)).toBe('');
    expect(thumbnail(null, 192)).toBe('');
  });
});

/*
 * Nhịp hỏi "tìm được chưa?".
 *
 * Toàn những mốc thời gian, mà mốc thời gian sai thì không ai thấy ngay —
 * chỉ là app hỏi quá dày thành phiền, hoặc im vĩnh viễn và mất luôn con số
 * của Objective 4. Cả hai đều âm thầm.
 */
describe('nudge — giữ nhịp hỏi', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('lần đầu thì được phép dò và được phép hỏi', async () => {
    await expect(nudge.dueForScan()).resolves.toBe(true);
    await expect(nudge.mayAsk('abc')).resolves.toBe(true);
  });

  // Không chặn thì mỗi lần bấm Back về Trang chủ lại bắn năm lượt gọi.
  it('dò xong thì im trong 12 tiếng', async () => {
    await nudge.markScanned();
    await expect(nudge.dueForScan()).resolves.toBe(false);
  });

  it('hoãn rồi thì không hỏi lại tin đó nữa', async () => {
    await nudge.snooze('abc', 7);
    await expect(nudge.mayAsk('abc')).resolves.toBe(false);
  });

  it('hoãn tin này không làm im tin khác', async () => {
    await nudge.snooze('abc', 7);
    await expect(nudge.mayAsk('xyz')).resolves.toBe(true);
  });

  // Tin đã bị xoá thì quên hẳn đi, khỏi giữ một cái hẹn cho một tin không
  // còn tồn tại.
  it('quên rồi thì lại được phép hỏi', async () => {
    await nudge.snooze('abc', 7);
    await nudge.forget('abc');
    await expect(nudge.mayAsk('abc')).resolves.toBe(true);
  });

  /*
   * Giá trị rác trong ổ đĩa phải rơi về "được phép hỏi".
   *
   * Number("linh tinh") ra NaN, mà NaN so sánh kiểu gì cũng ra false — nếu
   * viết nhầm chiều so sánh thì app im vĩnh viễn và không ai hiểu vì sao.
   * Thà hỏi thừa một lần còn hơn.
   */
  it('dữ liệu hỏng thì vẫn cho hỏi, không im luôn', async () => {
    await AsyncStorage.setItem('nudge:ask:abc', 'linh tinh');
    await expect(nudge.mayAsk('abc')).resolves.toBe(true);
  });

  it('hoãn 0 ngày thì hỏi lại được ngay', async () => {
    await nudge.snooze('abc', 0);
    await expect(nudge.mayAsk('abc')).resolves.toBe(true);
  });
});

/*
 * Danh sách tin máy này đã đăng.
 *
 * Dải hỏi dựa vào đây để biết hỏi ai. Lọc sai tiền tố thì nó đi hỏi về
 * những tin không phải của người đang cầm máy.
 */
describe('claim.list — tin của máy này', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('chưa đăng tin nào thì trả mảng rỗng', async () => {
    await expect(claim.list()).resolves.toEqual([]);
  });

  it('trả về đúng id, đã bỏ tiền tố', async () => {
    await claim.save('abc', 'MA1');
    await claim.save('xyz', 'MA2');
    const ids = await claim.list();
    expect(ids.sort()).toEqual(['abc', 'xyz']);
  });

  // AsyncStorage dùng chung cho mọi thứ: mã xác nhận, tin đã báo cáo, vị trí
  // đã lưu, ngôn ngữ. Lọc hụt một chữ là lôi cả đống khoá lạ về.
  it('không lẫn khoá của thứ khác', async () => {
    await claim.save('abc', 'MA1');
    await report.mark('xyz');
    await AsyncStorage.setItem('map:me', '[10,106]');
    await expect(claim.list()).resolves.toEqual(['abc']);
  });
});

/*
 * Đọc phần data của một thông báo đẩy.
 *
 * Đây là chỗ DUY NHẤT trong app đọc dữ liệu do back-end gửi xuống và biến nó
 * thành một lệnh điều hướng. Back-end gửi gì thì app nhận nấy, nên mọi dạng
 * dữ liệu méo đều phải ra null — chứ không phải ra một lệnh navigate() với tên
 * màn không tồn tại, thứ làm app sập ngay trên máy người dùng.
 */
describe('đọc màn hình cần mở từ thông báo đẩy', () => {
  it('tin cụ thể: nhận đúng mã tin', () => {
    expect(readTarget({ screen: 'Detail', id: 'abc123' })).toEqual({
      screen: 'Detail',
      id: 'abc123',
    });
  });

  it('tin nhắn trợ lý: không cần mã', () => {
    expect(readTarget({ screen: 'Chat' })).toEqual({ screen: 'Chat' });
  });

  /*
   * Thông báo không kèm data là chuyện bình thường, không phải lỗi: một câu
   * nhắc chung chung thì chạm vào chỉ cần mở app lên là đủ.
   */
  it('không có data: mở app, không nhảy màn nào', () => {
    expect(readTarget(undefined)).toBeNull();
    expect(readTarget(null)).toBeNull();
    expect(readTarget({})).toBeNull();
  });

  // Mấy dạng méo dưới đây đều có thật khi hai bên hiểu khác nhau về hợp đồng.
  it('data méo: ra null chứ không ra lệnh nhảy màn', () => {
    expect(readTarget('Detail')).toBeNull();
    expect(readTarget(42)).toBeNull();
    expect(readTarget([{ screen: 'Detail', id: 'abc' }])).toBeNull();
  });

  /*
   * Thiếu mã tin là trường hợp nguy hiểm nhất, vì tên màn thì ĐÚNG.
   * navigate("Detail") mà không có id thì màn chi tiết gọi API với id rỗng,
   * nhận 404, rồi hiện ra "Không tìm thấy tin" — người dùng tưởng tin đã bị
   * xoá, trong khi lỗi nằm ở phần data của thông báo.
   */
  it('tên màn đúng nhưng thiếu hoặc sai mã tin: ra null', () => {
    expect(readTarget({ screen: 'Detail' })).toBeNull();
    expect(readTarget({ screen: 'Detail', id: '' })).toBeNull();
    expect(readTarget({ screen: 'Detail', id: 123 })).toBeNull();
    expect(readTarget({ screen: 'Detail', id: null })).toBeNull();
  });

  // Back-end thêm một loại thông báo mới mà app chưa biết: thà không nhảy đâu
  // cả còn hơn gọi navigate() với một tên màn không có trong app.
  it('tên màn app chưa biết: ra null', () => {
    expect(readTarget({ screen: 'Admin' })).toBeNull();
    expect(readTarget({ screen: 'Profile', id: 'abc' })).toBeNull();
  });
});

/*
 * Lấy mã thiết bị.
 *
 * Ba đường chặn ở đầu hàm đáng kiểm vì cả ba đều là chuyện xảy ra hằng ngày
 * lúc làm việc, và cả ba PHẢI im lặng bỏ qua chứ không được ném lỗi: máy ảo
 * không có dịch vụ đẩy, Expo Go không mang khoá đẩy, người dùng bấm Không
 * cho phép.
 */
describe('lấy mã thiết bị để nhận thông báo', () => {
  it('máy ảo: trả lý do "simulator", không ném lỗi', async () => {
    const Device = require('expo-device');
    Device.isDevice = false;

    await expect(getPushToken()).resolves.toEqual({ ok: false, reason: 'simulator' });

    Device.isDevice = true;
  });

  it('người dùng từ chối: trả lý do "denied"', async () => {
    const Notifications = require('expo-notifications');
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    await expect(getPushToken()).resolves.toEqual({ ok: false, reason: 'denied' });
  });

  /*
   * Bước lấy mã GỌI MẠNG tới máy chủ Expo. Mất mạng hay Wi-Fi trường chặn thì
   * nó ném — và nếu hàm để lỗi đó nổi lên thì useEffect bên App.tsx nhận một
   * promise bị từ chối, hiện ra thành cảnh báo đỏ lúc đăng nhập.
   */
  it('máy chủ Expo không trả lời: trả lý do "failed", không ném lỗi', async () => {
    const Notifications = require('expo-notifications');
    Notifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('mat mang'));

    await expect(getPushToken()).resolves.toEqual({ ok: false, reason: 'failed' });
  });

  it('bình thường: trả về mã', async () => {
    await expect(getPushToken()).resolves.toEqual({
      ok: true,
      token: 'ExponentPushToken[test]',
    });
  });
});

/*
 * Nhớ tạm danh sách tin.
 *
 * Đây là chỗ đọc dữ liệu TỪ Ổ ĐĨA vào, nên nó phải chịu được mọi thứ nằm sẵn
 * ở đó: bản app cũ ghi kiểu khác, file ghi dở vì hết pin, người dùng khôi phục
 * máy từ bản sao lưu cũ. Hỏng cái nào cũng chỉ được phép ra null — đây là
 * đường tăng tốc, không phải đường chính, nên nó không bao giờ được làm sập
 * màn hình.
 */
describe('nhớ tạm danh sách tin', () => {
  const petGia = (id: string) =>
    ({ _id: id, name: `Tin ${id}`, type: "lost", species: "Chó" }) as never;

  beforeEach(async () => {
    await clearPets();
  });

  it('chưa có gì thì ra null', async () => {
    await expect(readPets()).resolves.toBeNull();
  });

  it('ghi rồi đọc lại ra đúng thứ đã ghi', async () => {
    await savePets([petGia('a'), petGia('b')], 42);

    const saved = await readPets();
    expect(saved?.total).toBe(42);
    expect(saved?.pets).toHaveLength(2);
    expect(saved?.pets[0]._id).toBe('a');
  });

  /*
   * Cắt bớt để mỗi lần ghi không thành một chuỗi JSON vài trăm KB. Người dùng
   * cuộn xuống là danh sách nối dài ra cả trăm tin, mà mở app lên cũng chỉ
   * nhìn được chừng mười tin đầu.
   */
  it('chỉ nhớ 12 tin đầu dù đưa vào nhiều hơn', async () => {
    const nhieu = Array.from({ length: 50 }, (_, i) => petGia(String(i)));
    await savePets(nhieu, 50);

    const saved = await readPets();
    expect(saved?.pets).toHaveLength(12);
    // Vẫn nhớ TỔNG thật, không phải 12 — con số đó hiện ra cho người dùng đọc.
    expect(saved?.total).toBe(50);
  });

  /*
   * Quá một ngày thì bỏ. Danh sách cũ một tuần có thể đầy tin đã đoàn tụ —
   * hiện ra rồi lặng lẽ biến mất lúc làm mới xong, nhìn như app bị lỗi.
   */
  it('quá một ngày thì coi như không có', async () => {
    await savePets([petGia('a')], 1);

    // Nhảy tới 25 giờ sau. Đổi đồng hồ chứ không chờ thật.
    const that = Date.now;
    Date.now = () => that() + 25 * 60 * 60 * 1000;
    try {
      await expect(readPets()).resolves.toBeNull();
    } finally {
      Date.now = that;
    }
  });

  it('vẫn trong ngày thì giữ', async () => {
    await savePets([petGia('a')], 1);

    const that = Date.now;
    Date.now = () => that() + 23 * 60 * 60 * 1000;
    try {
      await expect(readPets()).resolves.not.toBeNull();
    } finally {
      Date.now = that;
    }
  });

  // Mấy dạng hỏng dưới đây đều có thật trên máy người dùng.
  it('dữ liệu hỏng thì ra null chứ không ném lỗi', async () => {
    const kho = [
      'khong phai JSON',
      'null',
      '[]',
      JSON.stringify({ pets: [], total: 1 }), // thiếu savedAt
      JSON.stringify({ pets: 'khong phai mang', total: 1, savedAt: Date.now() }),
      JSON.stringify({ pets: [], total: 'khong phai so', savedAt: Date.now() }),
    ];

    for (const xau of kho) {
      await AsyncStorage.setItem('cache:pets', xau);
      await expect(readPets()).resolves.toBeNull();
    }
  });

  it('xoá rồi thì đọc ra null', async () => {
    await savePets([petGia('a')], 1);
    await clearPets();
    await expect(readPets()).resolves.toBeNull();
  });
});
