import { areaFromCoords } from '../src/geocode';

// Chặn hẳn đường ra Nominatim và giữ lại thứ đã gửi để đọc.
let fetchGoi = [];
let fetchTra;

beforeEach(() => {
  fetchGoi = [];
  fetchTra = {
    ok: true,
    json: async () => ({ address: { suburb: 'Phường Bảy Hiền', city: 'Thành phố Hồ Chí Minh' } }),
  };
  global.fetch = jest.fn(async (url, opts) => {
    fetchGoi.push({ url: String(url), opts });
    if (fetchTra instanceof Error) throw fetchTra;
    return fetchTra;
  });
});

// Toạ độ gửi đi nằm trong query string, moi ra để kiểm.
const toaDoDaGui = () => {
  const u = new URL(fetchGoi[0].url);
  return { lat: Number(u.searchParams.get('lat')), lng: Number(u.searchParams.get('lon')) };
};

describe('toạ độ được làm nhiễu TRƯỚC khi rời khỏi trình duyệt', () => {
  it('làm tròn về lưới 500m, không gửi bản chính xác', async () => {
    // Nút "dùng vị trí của tôi" trả về toạ độ chính xác tới từng mét.
    await areaFromCoords(10.7823456, 106.6987654);

    const gui = toaDoDaGui();
    expect(gui.lat).not.toBe(10.7823456);
    expect(gui.lng).not.toBe(106.6987654);
    // Lưới 0,005 độ: mọi giá trị gửi đi phải là bội của nó.
    expect(Math.round(gui.lat / 0.005)).toBeCloseTo(gui.lat / 0.005, 6);
    expect(Math.round(gui.lng / 0.005)).toBeCloseTo(gui.lng / 0.005, 6);
  });

  it('lệch không quá 500m so với điểm thật', async () => {
    await areaFromCoords(10.7823456, 106.6987654);

    const gui = toaDoDaGui();
    // Nửa ô lưới là mức lệch lớn nhất có thể. Rộng hơn là làm nhiễu quá tay
    // và tên quận trả về sẽ sai.
    expect(Math.abs(gui.lat - 10.7823456)).toBeLessThanOrEqual(0.0025 + 1e-9);
    expect(Math.abs(gui.lng - 106.6987654)).toBeLessThanOrEqual(0.0025 + 1e-9);
  });

  it('cùng một ô lưới thì gửi đi cùng một toạ độ', async () => {
    // Hai nhà cạnh nhau không được phân biệt được qua thứ gửi ra ngoài.
    await areaFromCoords(10.7810, 106.6980);
    await areaFromCoords(10.7812, 106.6982);

    const a = new URL(fetchGoi[0].url).searchParams.get('lat');
    const b = new URL(fetchGoi[1].url).searchParams.get('lat');
    expect(a).toBe(b);
  });
});

describe('không gửi kèm thứ không được phép gửi', () => {
  it('KHÔNG đính token đăng nhập', async () => {
    // Thực thể axios chung của web tự gắn Authorization vào mọi request. Dùng
    // nó ở đây là gửi token sang máy chủ của người khác.
    await areaFromCoords(10.78, 106.69);

    const { opts } = fetchGoi[0];
    expect(JSON.stringify(opts || {})).not.toMatch(/Authorization/i);
    expect(opts.credentials).toBe('omit');
  });
});

describe('ghép tên khu vực', () => {
  it('rút gọn tên thành phố cho khớp dữ liệu đang có', async () => {
    // Ô khu vực lọc bằng so chuỗi, nên "Thành phố Hồ Chí Minh" và "TP.HCM"
    // là hai thứ không tìm thấy nhau.
    expect(await areaFromCoords(10.78, 106.69)).toBe('Phường Bảy Hiền, TP.HCM');
  });

  it('bỏ tiền tố Tỉnh và Thành phố ở nơi khác', async () => {
    fetchTra = {
      ok: true,
      json: async () => ({ address: { town: 'Thị trấn Long Điền', state: 'Tỉnh Bà Rịa - Vũng Tàu' } }),
    };
    expect(await areaFromCoords(10.49, 107.22)).toBe('Thị trấn Long Điền, Bà Rịa - Vũng Tàu');
  });

  it('dữ liệu cũ còn cấp quận thì vẫn dùng được', async () => {
    fetchTra = {
      ok: true,
      json: async () => ({ address: { city_district: 'Quận 3', city: 'Thành phố Hồ Chí Minh' } }),
    };
    expect(await areaFromCoords(10.78, 106.68)).toBe('Quận 3, TP.HCM');
  });
});

describe('hỏng thì không chặn người dùng đăng tin', () => {
  it('mạng lỗi thì trả chuỗi rỗng, không ném', async () => {
    fetchTra = new Error('mat mang');
    await expect(areaFromCoords(10.78, 106.69)).resolves.toBe('');
  });

  it('máy chủ trả mã lỗi thì cũng chỉ trả chuỗi rỗng', async () => {
    fetchTra = { ok: false, json: async () => ({}) };
    expect(await areaFromCoords(10.78, 106.69)).toBe('');
  });

  it('toạ độ không hợp lệ thì KHÔNG gọi mạng', async () => {
    expect(await areaFromCoords(null, undefined)).toBe('');
    expect(await areaFromCoords(NaN, 106.69)).toBe('');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
