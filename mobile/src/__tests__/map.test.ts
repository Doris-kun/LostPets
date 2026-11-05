import { formatDistanceKm, distanceKm, directionsUrl, hasPoint, mapHtml, AREA_RADIUS_M, DEFAULT_CENTER } from '../map';

/*
 * Bộ test cho src/map.ts.
 *
 * Mỗi nhóm dưới đây gắn với một lỗi ĐÃ XẢY RA THẬT trong dự án, không phải
 * nghĩ ra cho đủ số. Lỗi đã xảy ra một lần thì hay xảy ra lại — nhất là khi
 * sau này chuyển sang NativeWind và đổi lại giao diện.
 */

describe('hasPoint — chưa chọn vị trí thì phải trả về false', () => {
  /*
   * ĐÂY LÀ LỖI TỐN NHIỀU CÔNG NHẤT CỦA CẢ DỰ ÁN.
   *
   * Bản đầu viết: Number.isFinite(Number(o.lat))
   * Mà Number(null) ra 0, và 0 là một toạ độ HỢP LỆ — đúng giữa Đại Tây Dương.
   *
   * Hậu quả: chưa chọn vị trí nhưng app vẫn tin là có, bản đồ bay tới 0,0 rồi
   * hiện một vùng biển xanh nhạt mênh mông. Nhìn y như bản đồ không tải được,
   * nên đã đi sửa nhầm hai lần — đổ cho bộ lọc màu, rồi đổ cho nhà cung cấp ô
   * bản đồ — trước khi tìm ra nguyên nhân thật.
   */
  it('null không phải là toạ độ', () => {
    expect(hasPoint({ lat: null, lng: null })).toBe(false);
  });

  it('undefined không phải là toạ độ', () => {
    expect(hasPoint({ lat: undefined, lng: undefined })).toBe(false);
  });

  it('chuỗi rỗng không phải là toạ độ — dữ liệu qua FormData hay ra thế này', () => {
    expect(hasPoint({ lat: '', lng: '' })).toBe(false);
  });

  it('thiếu một nửa cũng không tính', () => {
    expect(hasPoint({ lat: 10.776, lng: null })).toBe(false);
    expect(hasPoint({ lat: null, lng: 106.7 })).toBe(false);
  });

  it('không có object thì false, không ném lỗi', () => {
    expect(hasPoint(null)).toBe(false);
    expect(hasPoint(undefined)).toBe(false);
  });

  it('toạ độ thật thì true', () => {
    expect(hasPoint({ lat: 10.776, lng: 106.7 })).toBe(true);
  });

  it('chuỗi số vẫn tính — dữ liệu đi qua FormData thành chuỗi hết', () => {
    expect(hasPoint({ lat: '10.776', lng: '106.7' })).toBe(true);
  });

  it('số 0 THẬT SỰ thì vẫn là toạ độ hợp lệ', () => {
    // Ranh giới của chính lỗi trên: phải loại null mà KHÔNG loại số 0 thật.
    expect(hasPoint({ lat: 0, lng: 0 })).toBe(true);
  });

  it('chữ không phải số thì false', () => {
    expect(hasPoint({ lat: 'abc', lng: 'xyz' })).toBe(false);
  });
});

describe('directionsUrl', () => {
  it('dựng đúng link chung của Google Maps', () => {
    expect(directionsUrl(10.776, 106.7)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=10.776,106.7',
    );
  });
});

describe('mapHtml — trang Leaflet nhúng vào WebView', () => {
  // Tám tổ hợp của ba công tắc. Chạy hết vì mỗi tổ hợp là một nhánh khác nhau
  // trong chuỗi HTML, và lỗi cú pháp ở một nhánh thì bản đồ trắng trơn.
  const toHop = [
    { pick: false, interactive: false, isDark: false },
    { pick: false, interactive: false, isDark: true },
    { pick: false, interactive: true, isDark: false },
    { pick: false, interactive: true, isDark: true },
    { pick: true, interactive: false, isDark: false },
    { pick: true, interactive: false, isDark: true },
    { pick: true, interactive: true, isDark: false },
    { pick: true, interactive: true, isDark: true },
  ];

  it.each(toHop)('mã JavaScript bên trong hợp lệ (%o)', (opts) => {
    const html = mapHtml(opts);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    // new Function CHỈ biên dịch, không chạy — đủ để bắt lỗi cú pháp.
    expect(() => new Function(scripts[0][1])).not.toThrow();
  });

  it.each(toHop)('luôn ghi nguồn OpenStreetMap (%o)', (opts) => {
    // Bắt buộc theo điều khoản của OpenStreetMap. Bỏ đi là vi phạm, mà lỡ tay
    // xoá thì không ai nhận ra — nên để test canh.
    expect(mapHtml(opts)).toContain('openstreetmap.org/copyright');
  });

  it('chế độ tối đảo màu TỪNG ảnh ô bản đồ, không đảo cả khung', () => {
    // Đặt bộ lọc lên .leaflet-tile-pane thì trình duyệt gộp mọi ô thành một
    // lớp vẽ chung, nặng hơn và vẽ lại nhiều hơn mức cần.
    const toi = mapHtml({ isDark: true });
    expect(toi).toContain('.leaflet-tile {');
    expect(toi).not.toContain('.leaflet-tile-pane {');
  });

  it('chế độ sáng không có bộ lọc màu nào', () => {
    expect(mapHtml({ isDark: false })).not.toContain('invert(1)');
  });

  it('chế độ tĩnh khoá hết thao tác', () => {
    expect(mapHtml({ interactive: false })).toContain('var INTERACTIVE = false;');
  });

  it('mặc định nhìn về TP.HCM', () => {
    expect(mapHtml()).toContain(`${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}`);
  });

  it('vẽ vùng tròn đúng bán kính back-end làm tròn tới', () => {
    // Back-end làm tròn toạ độ về lưới 0,005 độ ~ 550m (hàm fuzz trong
    // petModel.js). Vẽ nhỏ hơn là ngụ ý biết chính xác hơn sự thật.
    expect(AREA_RADIUS_M).toBe(550);
    expect(mapHtml()).toContain(`radius: ${AREA_RADIUS_M}`);
  });
});

/*
 * Khoảng cách giữa hai điểm, dùng để đếm "mấy tin trong bán kính 2km".
 *
 * Test bằng những con số tra được chứ không bằng kết quả hàm tự trả về —
 * chép kết quả của chính nó vào test thì test chỉ xác nhận hàm không đổi,
 * không xác nhận hàm đúng.
 */
describe('distanceKm — khoảng cách trên mặt đất', () => {
  it('cùng một điểm thì bằng 0', () => {
    expect(distanceKm({ lat: 10.776, lng: 106.7 }, { lat: 10.776, lng: 106.7 })).toBe(0);
  });

  // 1 độ vĩ tuyến dài khoảng 111.2km ở mọi nơi trên Trái Đất.
  it('1 độ vĩ tuyến ra khoảng 111km', () => {
    const d = distanceKm({ lat: 10, lng: 106 }, { lat: 11, lng: 106 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  /*
   * Chỗ dễ sai nhất, và là lý do không được trừ toạ độ rồi lấy căn:
   * 1 độ KINH tuyến ở xích đạo dài 111km, nhưng ở vĩ độ 60 chỉ còn một
   * nửa. Cùng một hiệu số toạ độ mà khoảng cách thật khác hẳn nhau.
   */
  it('1 độ kinh tuyến ngắn dần khi lên vĩ độ cao', () => {
    const xichDao = distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const viDo60 = distanceKm({ lat: 60, lng: 0 }, { lat: 60, lng: 1 });
    expect(xichDao).toBeGreaterThan(111);
    expect(viDo60).toBeCloseTo(xichDao / 2, 0);
  });

  it('đo chiều nào cũng ra một kết quả', () => {
    const a = { lat: 10.776, lng: 106.7 };
    const b = { lat: 10.82, lng: 106.63 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });

  // Hai điểm trong nội thành, cách nhau chừng 1.1km — mức mà bán kính
  // "gần tôi" 2km phải tính là gần.
  it('hai điểm cách 0.01 độ vĩ ra khoảng 1.1km', () => {
    const d = distanceKm({ lat: 10.776, lng: 106.7 }, { lat: 10.786, lng: 106.7 });
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });
});

/*
 * Khoảng cách đổi thành chữ cho người đọc.
 *
 * Mọi con số đều kèm dấu ngã, và đó không phải chuyện thẩm mỹ: toạ độ đã bị
 * làm tròn về lưới 500m ngay lúc lưu, nên in "2.34 km" là nói quá độ chính
 * xác mình thực sự có. Test canh đúng chỗ đó.
 */
describe('formatDistanceKm — khoảng cách thành chữ', () => {
  it('dưới 1km thì làm tròn về trăm mét', () => {
    expect(formatDistanceKm(0.34)).toBe('~300 m');
    expect(formatDistanceKm(0.85)).toBe('~900 m');
  });

  // Dữ liệu gốc đã nhiễu 500m, nên "~20 m" là một lời nói dối.
  it('không bao giờ in nhỏ hơn 100m', () => {
    expect(formatDistanceKm(0.02)).toBe('~100 m');
    expect(formatDistanceKm(0)).toBe('~100 m');
  });

  it('từ 1 đến dưới 10km lấy một chữ số thập phân', () => {
    expect(formatDistanceKm(1)).toBe('~1.0 km');
    expect(formatDistanceKm(2.34)).toBe('~2.3 km');
    expect(formatDistanceKm(9.99)).toBe('~10.0 km');
  });

  it('từ 10km trở lên thì lấy số nguyên', () => {
    expect(formatDistanceKm(10)).toBe('~10 km');
    expect(formatDistanceKm(312.7)).toBe('~313 km');
  });

  it('luôn kèm dấu ngã, vì toạ độ vốn đã được làm nhiễu', () => {
    for (const km of [0.1, 0.5, 1, 5, 50, 500]) {
      expect(formatDistanceKm(km).startsWith('~')).toBe(true);
    }
  });

  // Tin không ghim toạ độ thì phép tính ra NaN. Trả chuỗi rỗng để nơi gọi
  // biết mà thay bằng "Xem chi tiết", chứ in ra "~NaN km" thì quá tệ.
  it('số không hợp lệ thì trả chuỗi rỗng', () => {
    expect(formatDistanceKm(Number.NaN)).toBe('');
    expect(formatDistanceKm(Number.POSITIVE_INFINITY)).toBe('');
  });
});
