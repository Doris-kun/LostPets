import { render, screen, fireEvent } from '@testing-library/react-native';

import type { ReactNode } from 'react';
import PetCard from '../components/PetCard';
import { LanguageProvider } from '../context/language';
import { ThemeProvider } from '../context/theme';
import { lightColors } from '../theme';
import type { Pet } from '../types';

/*
 * Bài test VẼ THẬT một component ra rồi soi kết quả.
 *
 * Khác hẳn mấy bộ test kia — chúng chỉ tính toán số hoặc đọc mã nguồn. Bộ này
 * chạy đúng dòng code mà điện thoại sẽ chạy, nên bắt được những thứ kia không
 * thấy: component nổ lúc vẽ, đọc một trường không tồn tại, vẽ nhầm nhãn.
 *
 * PetCard là thứ đáng test nhất trong các component: nó xuất hiện ở trang chủ,
 * màn "Bài của tôi", và thẻ nổi lên khi bấm pin trên bản đồ. Hỏng một chỗ là
 * hỏng cả ba.
 *
 * LƯU Ý: render() của @testing-library/react-native 14 trả về một Promise,
 * phải await. Quên await thì mọi câu hỏi sau đó đều báo "render function has
 * not been called" — thông báo không nói ra nguyên nhân thật.
 */

// Component nào cũng cần hai Provider này, vì chúng gọi useLanguage/useTheme.
const Khung = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <LanguageProvider>{children}</LanguageProvider>
  </ThemeProvider>
);

const tin = (p: Partial<Pet> = {}): Pet =>
  ({
    _id: 'abc123',
    postId: 'LOST-0042',
    type: 'lost',
    name: 'Mimi',
    species: 'Mèo',
    breed: 'Mèo ta',
    color: 'Tam thể',
    area: 'Quận 1, TP.HCM',
    contact: '0900000000',
    description: '',
    image: '',
    resolved: false,
    lat: null,
    lng: null,
    date: new Date().toISOString(),
    ...p,
  }) as Pet;

const ve = (
  pet: Pet,
  onPress: () => void = jest.fn(),
  showCode = false,
  me: { lat: number; lng: number } | null = null,
) =>
  render(
    <Khung>
      <PetCard pet={pet} onPress={onPress} showCode={showCode} me={me} />
    </Khung>,
  );

describe('PetCard vẽ ra được', () => {
  it('không nổ, và hiện tên con vật', async () => {
    await ve(tin());
    expect(screen.getByText('Mimi')).toBeTruthy();
  });

  it('không có tên thì lấy giống thay thế', async () => {
    // Tên là tuỳ chọn — người nhặt được con vật lạ thì làm gì biết nó tên gì.
    await ve(tin({ name: '' }));
    expect(screen.getByText('Mèo ta')).toBeTruthy();
  });

  it('hiện khu vực', async () => {
    await ve(tin());
    expect(screen.getByText('Quận 1, TP.HCM')).toBeTruthy();
  });

  /*
   * Mã tin mặc định KHÔNG hiện.
   *
   * Thẻ này dùng ở ba nơi, mà chỉ "Bài của tôi" là nơi người xem sở hữu tin
   * đó. Mặc định phải là giấu: quên bật thì chỉ thiếu một dòng chữ, còn quên
   * tắt thì phơi mã ra cho mọi người lạ ở trang chủ.
   *
   * Mã tin không phải bí mật — lộ ra cũng không làm gì được. Giấu đi là vì
   * gọn mắt. Thứ thật sự phải giữ kín là mã xác nhận, thứ cho phép sửa xoá.
   */
  it('mặc định KHÔNG hiện mã tin', async () => {
    await ve(tin());
    expect(screen.queryByText('LOST-0042')).toBeNull();
  });

  it('bật showCode thì mới hiện mã tin', async () => {
    await ve(tin(), jest.fn(), true);
    expect(screen.getByText('LOST-0042')).toBeTruthy();
  });

  it('bấm vào thì gọi onPress đúng một lần', async () => {
    const onPress = jest.fn();
    await ve(tin(), onPress);
    fireEvent.press(screen.getByText('Mimi'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('nhãn trạng thái', () => {
  it('tin báo mất', async () => {
    await ve(tin({ type: 'lost' }));
    expect(screen.getByText('Bị mất')).toBeTruthy();
  });

  it('tin nhặt được', async () => {
    await ve(tin({ type: 'found' }));
    expect(screen.getByText('Tìm thấy')).toBeTruthy();
  });

  it('đã đoàn tụ thì thắng cả type', async () => {
    await ve(tin({ type: 'lost', resolved: true }));
    expect(screen.getByText('Đã đoàn tụ')).toBeTruthy();
    expect(screen.queryByText('Bị mất')).toBeNull();
  });

  it('chữ trên nhãn dùng màu riêng của nhãn đó, không phải màu cố định', async () => {
    /*
     * Trước đây cả ba nhãn đều chữ trắng, mà chữ trắng trên nền cam chỉ đạt
     * 2.46:1 — dưới xa ngưỡng 4.5:1. Giờ màu chữ do statusStyle quyết định
     * riêng cho từng nhãn, nên test này canh để không ai gộp lại.
     */
    await ve(tin({ type: 'lost' }));
    const nhan = screen.getByText('Bị mất');
    expect(JSON.stringify(nhan.props.style)).toContain(lightColors.onLost);
  });
});

describe('ảnh', () => {
  /*
   * Soi cây đã vẽ bằng toJSON() thay vì tìm theo kiểu component.
   *
   * @testing-library/react-native 14 bỏ UNSAFE_getAllByType, và cố ý: tìm
   * theo kiểu là bám vào CÁCH DỰNG bên trong, đổi cách dựng là test vỡ dù
   * giao diện không đổi. toJSON() cho đúng thứ người dùng thấy.
   */
  it('có ảnh thì vẽ đúng ảnh đó', async () => {
    const r = await ve(tin({ image: 'https://example.com/meo.jpg' }));
    expect(JSON.stringify(r.toJSON())).toContain('https://example.com/meo.jpg');
  });

  it('không có ảnh thì vẽ logo thay thế, không để trống', async () => {
    /*
     * API trả image là CHUỖI RỖNG khi không có ảnh, KHÔNG phải null. Viết
     * pet.image === null để kiểm là sai, và thẻ sẽ hiện một ô trống.
     */
    const r = await ve(tin({ image: '' }));
    const cay = JSON.stringify(r.toJSON());
    // Không có ảnh nào tải từ mạng — tức đang vẽ logo đóng gói sẵn trong app
    expect(cay).not.toContain('http');
    // Và thẻ vẫn vẽ ra được, không rỗng
    expect(cay).toContain('Mimi');
  });
});

describe('ghim địa chỉ vẽ bằng icon', () => {
  it('dùng icon location chứ không phải ký tự 📍', async () => {
    /*
     * Ký tự emoji phụ thuộc phông của máy. Dấu → từng vỡ trên Android, vẽ ra
     * "′n" thay vì mũi tên. Từ đó mọi icon đều vẽ bằng Ionicons.
     */
    await ve(tin());
    expect(screen.getByTestId('icon-location')).toBeTruthy();
  });
});

/*
 * Hàng dưới cùng của thẻ không bao giờ được để trống một nửa.
 *
 * Đó đúng là chỗ thầy hướng dẫn nhận xét bên web, sau khi mã tin bị gỡ đi
 * mà chưa bù lại gì. Ba trường hợp, ba thứ khác nhau, không có trường hợp
 * nào trống.
 */
describe('PetCard — hàng dưới cùng luôn có nội dung', () => {
  const coToaDo = { lat: 10.776, lng: 106.7 };

  it('biết vị trí người xem thì hiện khoảng cách', async () => {
    // Cách khoảng 1.1km, đủ xa để không rơi vào nhánh làm tròn trăm mét.
    await ve(tin(coToaDo), jest.fn(), false, { lat: 10.786, lng: 106.7 });
    expect(screen.getByText(/cách bạn/)).toBeTruthy();
  });

  it('chưa biết vị trí thì mời bấm vào, không để trống', async () => {
    await ve(tin(coToaDo));
    expect(screen.getByText('Xem chi tiết')).toBeTruthy();
  });

  // Tin không ghim toạ độ thì không tính được khoảng cách, dù có biết người
  // xem đứng ở đâu. Phải rơi về lời mời bấm chứ không hiện "~NaN km".
  it('tin không có toạ độ thì cũng mời bấm vào', async () => {
    await ve(tin({ lat: null, lng: null }), jest.fn(), false, coToaDo);
    expect(screen.getByText('Xem chi tiết')).toBeTruthy();
  });

  // "Bài của tôi" bật showCode. Ở đó mã tin quan trọng hơn khoảng cách tới
  // chính tin của mình.
  it('bật showCode thì mã tin thắng khoảng cách', async () => {
    await ve(tin(coToaDo), jest.fn(), true, { lat: 10.786, lng: 106.7 });
    expect(screen.getByText('LOST-0042')).toBeTruthy();
    expect(screen.queryByText(/cách bạn/)).toBeNull();
  });
});
