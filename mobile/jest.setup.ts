/*
 * Chạy một lần trước mọi bài test.
 *
 * Mấy thư viện dưới đây nói chuyện với phần NATIVE của điện thoại — bộ nhớ
 * máy, GPS, trình duyệt hệ thống. Jest chạy trên Node, không có phần đó, nên
 * nạp thẳng vào là nổ ngay dòng import.
 *
 * Thay bằng bản giả. Không phải để "lách cho test xanh": phần native vốn là
 * của hệ điều hành, không phải code mình viết, nên không có gì để kiểm. Thứ
 * cần kiểm là app DÙNG chúng có đúng không.
 */

// Bản giả chính chủ, do nhóm làm AsyncStorage viết sẵn và kèm theo thư viện.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Vị trí: trả về một toạ độ cố định ở TP.HCM, và luôn đồng ý cấp quyền.
// Bài test nào cần thử trường hợp bị từ chối thì tự ghi đè lại.
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 10.776, longitude: 106.7 },
  })),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// WebView là một cửa sổ trình duyệt thật của hệ điều hành. Trong test nó chỉ
// cần là một khối rỗng có đúng tên, để biết nó đã được vẽ ra hay chưa.
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

/*
 * Bộ icon. Nạp thật thì nó kéo theo cả máy nạp phông của Expo, mà cái đó lại
 * cần expo-asset — một thư viện app không khai và cũng không cần, vì lúc chạy
 * thật Metro tự lo.
 *
 * Trong test, icon chỉ cần là một khối có GHI LẠI TÊN icon, để bài test kiểm
 * được "đúng cái icon đó có được vẽ ra không" — ví dụ nhãn Bị mất phải đi kèm
 * icon location chứ không phải icon gì khác.
 */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const gia = (props: { name?: string }) =>
    React.createElement('Icon', { testID: `icon-${props.name}`, ...props });
  return { Ionicons: gia, MaterialIcons: gia, FontAwesome: gia };
});
