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

/*
 * NativeWind bị loại khỏi bản biên dịch test (xem babel.config.js), nhưng
 * context/theme.tsx vẫn import { colorScheme } từ nó. Nạp gói thật trong môi
 * trường test thì nó kéo theo react-native-css-interop, thứ cần Metro mới
 * chạy được.
 *
 * Bản giả này chỉ cần nuốt lời gọi set() mà không làm gì: trong test không có
 * lớp tiện ích nào để áp dụng cả.
 */
jest.mock('nativewind', () => ({
  colorScheme: { set: jest.fn(), get: jest.fn(() => 'light') },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

/*
 * Thông báo đẩy.
 *
 * Nạp gói thật thì nó đòi phần native của Android/iOS ngay dòng import, và
 * src/notify.ts gọi setNotificationHandler ở ngoài hàm — tức là ngay lúc nạp
 * file. Nên thiếu bản giả này là MỌI bài test nào chạm tới notify.ts đều nổ
 * trước khi kịp chạy câu lệnh đầu tiên.
 *
 * Mặc định đặt ở trạng thái "máy thật, đã cho phép, lấy mã thành công" vì đó
 * là đường đi bình thường. Bài test nào cần thử đường hỏng thì tự ghi đè —
 * object trả về ở đây là object thường nên gán lại được.
 */
jest.mock('expo-notifications', () => ({
  /*
   * __esModule: true là BẮT BUỘC, không phải để cho đẹp.
   *
   * src/notify.ts viết `import * as Notifications`. Thiếu cờ này thì Babel coi
   * bản giả là module kiểu cũ và SAO RA MỘT OBJECT MỚI cho notify.ts dùng —
   * nên bài test ghi đè object gốc là ghi đè vào chỗ không ai đọc. Có cờ thì
   * hai bên cùng trỏ vào một object.
   */
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

// isDevice: máy thật hay máy ảo. Máy ảo không có dịch vụ đẩy của Google/Apple.
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));

/*
 * Cấu hình app lúc chạy.
 *
 * Bản giả của jest-expo không mang theo phần "extra" của app.json, nên
 * Constants.expoConfig.extra.eas.projectId là undefined — và src/notify.ts coi
 * đó là "chưa khai mã dự án" rồi dừng ngay, khiến mọi bài test về thông báo đo
 * phải nhánh sai.
 *
 * Đọc THẲNG app.json chứ không viết lại mã dự án vào đây: viết lại là có hai
 * nơi cùng giữ một giá trị, mà bài test lại là nơi ít ai nghĩ tới lúc đổi.
 *
 * appOwnership để null = app thật, không phải Expo Go. Đó là trạng thái cần
 * cho phần lớn bài test; bài nào muốn thử Expo Go thì tự ghi đè.
 */
jest.mock('expo-constants', () => {
  const app = require('./app.json');
  return {
    __esModule: true,
    default: { expoConfig: app.expo, appOwnership: null },
  };
});

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
