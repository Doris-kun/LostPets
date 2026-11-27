import { distanceKm, formatDistanceKm, colorForPet, PIN_COLORS } from '../src/map';

// Ba điểm thật ở TP.HCM, khoảng cách tra được trên bản đồ.
const Q1 = [10.7769, 106.7009];
const Q7 = [10.7340, 106.7220];
const CAN_THO = [10.0340, 105.7880];

describe('tính khoảng cách giữa hai điểm', () => {
  it('cùng một điểm thì bằng 0', () => {
    expect(distanceKm(...Q1, ...Q1)).toBeCloseTo(0, 6);
  });

  it('Quận 1 tới Quận 7 khoảng 5km', () => {
    const km = distanceKm(...Q1, ...Q7);
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(7);
  });

  it('TP.HCM tới Cần Thơ khoảng 130km đường chim bay', () => {
    // Đúng ca đã làm tầng so khớp gợi ý nhầm trước khi có bộ lọc địa lý.
    //
    // 130 chứ không phải 170: 170km là quãng đường BỘ, còn haversine đo
    // đường thẳng. Lẫn hai con số này thì mọi ngưỡng đặt theo nó đều lệch.
    const km = distanceKm(...Q1, ...CAN_THO);
    expect(km).toBeGreaterThan(120);
    expect(km).toBeLessThan(140);
  });

  it('đổi chỗ hai điểm thì kết quả không đổi', () => {
    expect(distanceKm(...Q1, ...Q7)).toBeCloseTo(distanceKm(...Q7, ...Q1), 9);
  });
});

describe('viết khoảng cách cho người đọc', () => {
  it('dưới 1km thì tính bằng mét, làm tròn trăm', () => {
    expect(formatDistanceKm(0.42)).toBe('~400 m');
    expect(formatDistanceKm(0.85)).toBe('~900 m');
  });

  it('rất gần cũng không ghi nhỏ hơn 100m', () => {
    // Toạ độ đã bị làm nhiễu 500m rồi, nên ghi "~10 m" là hứa một độ chính
    // xác không có thật.
    expect(formatDistanceKm(0.004)).toBe('~100 m');
    expect(formatDistanceKm(0)).toBe('~100 m');
  });

  it('từ 1 tới 10km thì lấy một chữ số thập phân', () => {
    expect(formatDistanceKm(4.137)).toBe('~4.1 km');
  });

  it('trên 10km thì làm tròn số nguyên', () => {
    expect(formatDistanceKm(170.4)).toBe('~170 km');
  });

  it('không có số thì trả chuỗi rỗng, không ghi NaN lên thẻ tin', () => {
    expect(formatDistanceKm(null)).toBe('');
    expect(formatDistanceKm(undefined)).toBe('');
    expect(formatDistanceKm(NaN)).toBe('');
  });
});

describe('màu ghim trên bản đồ', () => {
  it('tin đã đoàn tụ ưu tiên hơn loại tin', () => {
    // Tin đoàn tụ vẫn mang type lost hoặc found. Xét loại trước thì ghim vẫn
    // đỏ như tin đang tìm, người xem tưởng chưa ai nhận.
    expect(colorForPet({ resolved: true, type: 'lost' })).toBe(PIN_COLORS.resolved);
    expect(colorForPet({ resolved: true, type: 'found' })).toBe(PIN_COLORS.resolved);
  });

  it('chưa đoàn tụ thì phân biệt mất và nhặt được', () => {
    expect(colorForPet({ resolved: false, type: 'lost' })).toBe(PIN_COLORS.lost);
    expect(colorForPet({ resolved: false, type: 'found' })).toBe(PIN_COLORS.found);
  });
});
