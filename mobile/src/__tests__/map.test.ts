import { directionsUrl, hasPoint, mapHtml, AREA_RADIUS_M, DEFAULT_CENTER } from '../map';

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
