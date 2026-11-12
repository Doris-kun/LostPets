import { sized } from '../src/images';

const CLOUD = 'https://res.cloudinary.com/demo/image/upload/v1700000000/lost-pets/abc.jpg';

describe('xin Cloudinary trả ảnh đúng cỡ', () => {
  it('chèn tham số thu nhỏ vào ngay sau /upload/', () => {
    // Đo trên ảnh thật: 92.540 byte xuống 1.996 byte, nhẹ hơn 46 lần.
    expect(sized(CLOUD, 192))
      .toBe('https://res.cloudinary.com/demo/image/upload/w_192,q_auto,f_auto/v1700000000/lost-pets/abc.jpg');
  });

  it('giữ nguyên phần mã ảnh phía sau', () => {
    // Phần sau /upload/ chính là thứ back-end cắt ra để xoá ảnh. Đụng vào nó
    // là lệnh xoá trượt và ảnh nằm lại Cloudinary vĩnh viễn.
    expect(sized(CLOUD, 600)).toContain('/v1700000000/lost-pets/abc.jpg');
  });

  it('mỗi cỡ cho một địa chỉ riêng', () => {
    expect(sized(CLOUD, 192)).not.toBe(sized(CLOUD, 600));
  });
});

describe('không đụng vào địa chỉ không phải của Cloudinary', () => {
  it.each([
    ['https://cataas.com/cat', 'ảnh mẫu đang dùng trong dữ liệu'],
    ['https://placedog.net/500', 'ảnh mẫu đang dùng trong dữ liệu'],
    ['https://example.com/image/upload/a.jpg', 'có /upload/ nhưng khác tên miền'],
    ['http://res.cloudinary.com/demo/image/upload/a.jpg', 'http chứ không phải https'],
  ])('%s — %s', (url) => {
    // Chèn tham số vào địa chỉ của bên khác chỉ làm hỏng địa chỉ.
    expect(sized(url, 192)).toBe(url);
  });

  it('thiếu địa chỉ hoặc cỡ không hợp lệ thì trả nguyên si', () => {
    expect(sized('', 192)).toBe('');
    expect(sized(null, 192)).toBe(null);
    expect(sized(CLOUD, undefined)).toBe(CLOUD);
    expect(sized(CLOUD, NaN)).toBe(CLOUD);
  });
});
