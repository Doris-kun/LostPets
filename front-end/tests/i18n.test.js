import { t, setLang, langStore } from '../src/i18n';

beforeEach(() => {
  setLang('vi');
});

describe('dịch theo ngôn ngữ đang chọn', () => {
  it('đổi ngôn ngữ thì đổi câu trả về', () => {
    const vi = t('nav.post');
    setLang('en');
    const en = t('nav.post');

    expect(vi).toBeTruthy();
    expect(en).toBeTruthy();
    expect(en).not.toBe(vi);
  });

  it('nhớ lựa chọn để lần sau mở lại vẫn đúng ngôn ngữ', () => {
    setLang('en');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(langStore.lang).toBe('en');
  });
});

describe('thay giá trị vào câu dịch', () => {
  it('thay đúng ô có tên tương ứng', () => {
    // Tiếng Việt và tiếng Anh đặt con số ở vị trí khác nhau trong câu. Ghép
    // chuỗi ngoài chỗ gọi thì đúng ngữ pháp một thứ tiếng và sai thứ kia.
    expect(t('card.away', { d: '~4.1 km' })).toContain('~4.1 km');

    setLang('en');
    expect(t('card.away', { d: '~4.1 km' })).toContain('~4.1 km');
  });

  it('thiếu giá trị thì để nguyên ô, không ghi undefined lên màn hình', () => {
    expect(t('card.away', {})).toContain('{d}');
    expect(t('card.away', {})).not.toContain('undefined');
  });

  it('không truyền gì thì trả câu gốc', () => {
    expect(t('card.away')).toContain('{d}');
  });
});

describe('khoá không có bản dịch', () => {
  it('trả về chính khoá đó, không trả chuỗi rỗng', () => {
    // Trả rỗng thì chỗ đó biến mất khỏi giao diện và không ai biết thiếu gì.
    // Trả tên khoá thì nhìn là thấy ngay.
    expect(t('khoa.khong.ton.tai')).toBe('khoa.khong.ton.tai');
  });
});

describe('hai ngôn ngữ phải đủ khoá như nhau', () => {
  it('mọi khoá tiếng Việt đều có bản tiếng Anh và ngược lại', () => {
    // Thiếu một khoá thì người dùng đang xem tiếng Anh đột nhiên thấy một
    // dòng tiếng Việt, hoặc thấy luôn tên khoá.
    // eslint-disable-next-line global-require
    const nguon = require('fs').readFileSync(require.resolve('../src/i18n.js'), 'utf8');
    const viStart = nguon.indexOf('\n  vi: {');
    const enStart = nguon.indexOf('\n  en: {');
    expect(viStart).toBeGreaterThan(-1);
    expect(enStart).toBeGreaterThan(viStart);

    const khoaCua = (khoi) =>
      new Set([...khoi.matchAll(/^\s{4}'([^']+)'\s*:/gm)].map((m) => m[1]));
    const vi = khoaCua(nguon.slice(viStart, enStart));
    const en = khoaCua(nguon.slice(enStart));

    expect([...vi].filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !vi.has(k))).toEqual([]);
    expect(vi.size).toBeGreaterThan(200);
  });
});
