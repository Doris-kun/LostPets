import { words, type WordKey } from '../word';

/*
 * Bộ test cho kho chữ song ngữ.
 *
 * TypeScript đã chặn chuyện bản tiếng Anh thiếu key (en khai kiểu
 * Record<WordKey, string>). Nhưng test vẫn có việc riêng: bắt những thứ
 * TypeScript không thấy được — chữ bỏ trống, chỗ nội suy {n} lệch nhau giữa
 * hai thứ tiếng, hay quên dịch mà chép nguyên bản tiếng Việt sang.
 */

const viKeys = Object.keys(words.vi) as WordKey[];

describe('hai thứ tiếng', () => {
  it('có cùng bộ tên câu', () => {
    expect(Object.keys(words.en).sort()).toEqual(viKeys.slice().sort());
  });

  it('không có câu nào bỏ trống', () => {
    for (const key of viKeys) {
      expect(words.vi[key].trim()).not.toBe('');
      expect(words.en[key].trim()).not.toBe('');
    }
  });

  /*
   * Chỗ nội suy phải khớp nhau giữa hai thứ tiếng.
   *
   * t('home.results', { n: 19 }) thay {n} bằng 19. Nếu bản tiếng Việt có {n}
   * mà bản tiếng Anh quên, người dùng tiếng Anh sẽ thấy "posts shown" không
   * có số nào — không báo lỗi, chỉ là thiếu thông tin một cách lặng lẽ.
   */
  it('chỗ nội suy {..} khớp nhau giữa hai bản', () => {
    const choNoiSuy = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();

    for (const key of viKeys) {
      expect({ key, cho: choNoiSuy(words.en[key]) }).toEqual({
        key,
        cho: choNoiSuy(words.vi[key]),
      });
    }
  });
});

describe('quy ước đặt tên', () => {
  /*
   * Cho phép cả dấu gạch dưới, chỉ vì một nhóm tên: report.reason.fake_image
   * và report.reason.wrong_contact.
   *
   * Phần đuôi của hai tên đó là MÃ CỦA SERVER, lấy nguyên si từ REASONS trong
   * back-end/api/models/reportModel.js. Giữ nguyên si thì giao diện ghép thẳng
   * tên câu ra từ mã lý do, không cần một bảng đổi tên ở giữa — mà bảng đó
   * chính là chỗ dễ quên cập nhật nhất mỗi khi back-end thêm lý do mới.
   */
  it('mọi tên câu đều có dạng khu-vuc.ten-cu-the', () => {
    for (const key of viKeys) {
      expect(key).toMatch(/^[a-z]+\.[a-zA-Z0-9._]+$/);
    }
  });

  it('không có tên câu nào trùng nhau', () => {
    expect(new Set(viKeys).size).toBe(viKeys.length);
  });
});

describe('không còn ký tự dùng làm icon trong chữ', () => {
  /*
   * Dấu → từng nằm trong chuỗi chữ và VỠ trên Android: phông hệ thống của máy
   * đó không có ký tự ấy nên vẽ ra "′n". Dấu ✓ cũng từng nằm trong
   * 'detail.resolve'.
   *
   * Từ đó mọi icon đều vẽ bằng Ionicons — phông icon đóng gói bên trong app
   * nên máy nào cũng giống nhau. Test này canh để không ai lỡ tay thêm lại.
   */
  const choPhep = new Set(['—', '·', '’', '…', '–', '"', '"']);

  it.each(['vi', 'en'] as const)('bản %s', (lang) => {
    const xau: string[] = [];

    for (const key of viKeys) {
      for (const c of words[lang][key]) {
        const ma = c.codePointAt(0) ?? 0;
        // Bỏ qua chữ Latin, dấu tiếng Việt, và mấy dấu câu quen thuộc
        if (ma <= 0x2000) continue;
        if (/[À-ɏḀ-ỿ]/.test(c)) continue;
        if (choPhep.has(c)) continue;
        xau.push(`${key}: "${c}" (U+${ma.toString(16).toUpperCase()})`);
      }
    }

    expect(xau).toEqual([]);
  });
});
