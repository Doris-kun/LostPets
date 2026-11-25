// auth.js đọc localStorage NGAY LÚC NẠP MODULE, nên phải nạp lại sau mỗi lần
// đổi localStorage. jest.isolateModules cho mỗi lượt một bản sạch.
const nap = () => {
  let auth;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    auth = require('../src/auth').default;
  });
  return auth;
};

const NGUOI = { _id: 'u1', name: 'Người Dùng', email: 'a@example.com', role: 'user' };
const SEP = { ...NGUOI, role: 'admin' };

beforeEach(() => {
  localStorage.clear();
});

describe('giữ phiên qua lần tải lại trang', () => {
  it('đăng nhập xong thì lưu cả token lẫn tài khoản', () => {
    const auth = nap();
    auth.login('token-abc', NGUOI);

    expect(localStorage.getItem('auth:token')).toBe('token-abc');
    expect(JSON.parse(localStorage.getItem('auth:user'))).toEqual(NGUOI);
  });

  it('nạp lại trang thì vẫn còn đăng nhập', () => {
    nap().login('token-abc', NGUOI);

    // Đây là cả lý do dùng localStorage: F5 không được làm mất phiên.
    const sau = nap();
    expect(sau.isLoggedIn()).toBe(true);
    expect(sau.user.name).toBe('Người Dùng');
  });

  it('đăng xuất thì xoá sạch, nạp lại vẫn là khách', () => {
    const auth = nap();
    auth.login('token-abc', NGUOI);
    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('auth:token')).toBe(null);
    expect(localStorage.getItem('auth:user')).toBe(null);
    expect(nap().isLoggedIn()).toBe(false);
  });
});

describe('cập nhật tài khoản mà không đụng token', () => {
  it('setUser đổi thông tin nhưng giữ nguyên phiên', () => {
    const auth = nap();
    auth.login('token-abc', NGUOI);

    // Dùng khi hỏi lại máy chủ lúc mở trang: vai trò có thể đã đổi ở máy
    // khác, mà token thì vẫn còn hiệu lực.
    auth.setUser(SEP);

    expect(auth.token).toBe('token-abc');
    expect(auth.isAdmin()).toBe(true);
  });

  it('thông tin mới sống sót qua lần tải lại', () => {
    const auth = nap();
    auth.login('token-abc', NGUOI);
    auth.setUser(SEP);

    expect(nap().isAdmin()).toBe(true);
  });
});

describe('nhận ra quản trị viên', () => {
  it('chỉ đúng khi vai trò là admin', () => {
    const auth = nap();
    auth.login('t', SEP);
    expect(auth.isAdmin()).toBe(true);

    auth.setUser(NGUOI);
    expect(auth.isAdmin()).toBe(false);
  });

  it('chưa đăng nhập thì không phải quản trị viên', () => {
    expect(nap().isAdmin()).toBe(false);
  });

  it('thiếu trường role thì KHÔNG coi là quản trị viên', () => {
    const auth = nap();
    auth.login('t', { _id: 'u2', name: 'Thiếu role' });
    // Bản sao tài khoản cũ trong máy người dùng có thể thiếu trường mới thêm.
    // Mặc định phải là không có quyền.
    expect(auth.isAdmin()).toBe(false);
  });
});

describe('localStorage hỏng thì không làm sập web', () => {
  it('đọc ném lỗi vẫn nạp được, chỉ là mất phiên', () => {
    const that = localStorage.getItem;
    localStorage.getItem = () => { throw new Error('cua so an danh'); };
    try {
      expect(nap().isLoggedIn()).toBe(false);
    } finally {
      localStorage.getItem = that;
    }
  });

  it('ghi ném lỗi vẫn đăng nhập được trong phiên hiện tại', () => {
    const auth = nap();
    const that = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('cua so an danh'); };
    try {
      auth.login('token-abc', NGUOI);
      // Không lưu được thì F5 sẽ mất phiên, nhưng đang dùng thì vẫn phải chạy.
      expect(auth.isLoggedIn()).toBe(true);
    } finally {
      localStorage.setItem = that;
    }
  });

  it('dữ liệu lưu bị hỏng thì bỏ qua, không ném', () => {
    localStorage.setItem('auth:user', 'day-khong-phai-json');
    localStorage.setItem('auth:token', 'token-abc');

    const auth = nap();
    expect(auth.user).toBe(null);
    expect(auth.isAdmin()).toBe(false);
  });
});
