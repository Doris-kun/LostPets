import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

/*
 * Thông báo đẩy (push notification).
 *
 * Phần này chỉ là PHÍA ĐIỆN THOẠI: xin quyền, lấy mã thiết bị, gửi mã lên
 * back-end, và xử lý lúc người dùng chạm vào thông báo. Việc GỬI thông báo là
 * của back-end — nó mới biết lúc nào có tin mới khớp khu vực, lúc nào có người
 * nhắn tin. Xem phần HỢP ĐỒNG VỚI BACK-END ở dưới.
 *
 * Luồng đi của một thông báo:
 *
 *   1. App xin quyền, nhận một mã dạng ExponentPushToken[xxxxx] từ máy chủ Expo
 *   2. App gửi mã đó lên back-end, back-end lưu theo user
 *   3. Có việc cần báo -> back-end gọi máy chủ Expo kèm mã
 *   4. Máy chủ Expo đẩy xuống Google (FCM) hoặc Apple (APNs)
 *   5. Điện thoại hiện thông báo, chạm vào thì App mở đúng màn hình
 *
 * Mã này KHÔNG phải thứ bí mật như mật khẩu, nhưng ai có nó thì gửi được thông
 * báo tới đúng máy đó, nên back-end vẫn phải đòi đăng nhập khi nhận mã.
 */

/*
 * Mã dự án trên Expo. Bắt buộc phải có khi lấy mã thiết bị.
 *
 * Đọc từ app.json chứ KHÔNG viết thẳng vào đây: nó đã nằm ở
 * extra.eas.projectId, và hai chỗ cùng ghi một giá trị thì sớm muộn lệch nhau.
 * Lệch là mã thiết bị trỏ sang một dự án Expo khác, thông báo gửi đi không bao
 * giờ tới.
 */
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

/*
 * Tên kênh thông báo trên Android.
 *
 * Android 8 trở lên BẮT BUỘC mọi thông báo phải thuộc một kênh, và người dùng
 * tắt/bật tiếng theo từng kênh trong Cài đặt máy. Không khai kênh thì thông
 * báo vẫn tới nhưng nằm im trong danh sách, không kêu, không hiện ra trên màn
 * hình — rất dễ tưởng là thông báo không hoạt động.
 */
const CHANNEL_ID = 'default';

/*
 * Quyết định thông báo trông thế nào khi app ĐANG MỞ.
 *
 * Mặc định: app đang mở thì hệ điều hành không hiện gì cả, vì nó cho rằng
 * người dùng đã thấy nội dung trong app rồi. Với app này thì sai — có tin mới
 * khớp khu vực là chuyện đáng ngắt lời người ta, kể cả khi họ đang mở app.
 *
 * shouldShowBanner / shouldShowList là tên của expo-notifications 58. Bản cũ
 * dùng shouldShowAlert, nay đã bỏ — viết tên cũ thì TypeScript không báo gì mà
 * thông báo lặng lẽ không hiện.
 *
 * Gọi ở ngoài hàm để chạy đúng một lần lúc nạp file, trước mọi thông báo.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/*
 * Đang chạy trong Expo Go hay trong app thật?
 *
 * Expo Go KHÔNG nhận được thông báo đẩy nữa kể từ SDK 53 — nó không mang theo
 * khoá đẩy của dự án mình. Nên trong Expo Go thì bỏ qua cả phần xin quyền:
 * xin xong cũng không lấy được mã, chỉ được một hộp thoại vô ích và một dòng
 * lỗi đỏ làm người ta tưởng app hỏng.
 *
 * Dùng appOwnership vì executionEnvironment gộp Expo Go chung với development
 * build, mà development build thì thông báo đẩy CHẠY ĐƯỢC. Xem giải thích dài
 * hơn trong components/SocialLogin.tsx.
 */
export const isExpoGo = (): boolean => Constants.appOwnership === 'expo';

/** Lý do không lấy được mã thiết bị, để chỗ gọi biết nên nói gì với người dùng. */
export type PushBlockedReason =
  /** Expo Go không mang khoá đẩy của dự án */
  | 'expo-go'
  /** Máy ảo không có dịch vụ đẩy của Google/Apple */
  | 'simulator'
  /** Thiếu extra.eas.projectId trong app.json */
  | 'no-project-id'
  /** Người dùng bấm Không cho phép */
  | 'denied'
  /** Máy chủ Expo không trả lời, thường là do mất mạng */
  | 'failed';

export type PushTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: PushBlockedReason };

/*
 * Dựng kênh thông báo trên Android.
 *
 * Gọi được nhiều lần, lần sau ghi đè lần trước. Trên iOS hàm này không tồn tại
 * nên phải chặn bằng Platform.OS, không thì nó ném lỗi.
 */
export async function prepareAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'LostPets',
    importance: Notifications.AndroidImportance.HIGH,
    // Rung nhẹ hai nhịp. Để mảng rỗng thì Android hiểu là KHÔNG rung.
    vibrationPattern: [0, 250, 250, 250],
  });
}

/*
 * Xin quyền rồi lấy mã thiết bị.
 *
 * Trả về một kết quả có lý do thất bại chứ không phải null, vì năm lý do ở
 * trên cần năm cách xử lý khác nhau: "máy ảo" là chuyện bình thường khi đang
 * lập trình, còn "người dùng từ chối" thì nên nhớ để đừng hỏi lại mỗi lần mở
 * app.
 *
 * KHÔNG gọi hàm này lúc app vừa mở. Hỏi quyền khi người ta chưa hiểu mình sẽ
 * gửi gì là cách nhanh nhất để bị bấm Không cho phép — mà trên iOS, từ chối
 * một lần là hộp thoại không bao giờ hiện lại, phải tự vào Cài đặt bật. Gọi
 * sau khi đăng nhập xong, lúc đó đã có lý do rõ ràng để gửi thông báo.
 */
export async function getPushToken(): Promise<PushTokenResult> {
  if (isExpoGo()) return { ok: false, reason: 'expo-go' };

  // Máy ảo không có FCM/APNs nên không có gì để đẩy tới.
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };

  if (!PROJECT_ID) return { ok: false, reason: 'no-project-id' };

  /*
   * Hỏi trạng thái TRƯỚC khi xin.
   *
   * requestPermissionsAsync gọi lần thứ hai trên iOS không hiện hộp thoại nữa,
   * nó trả về luôn trạng thái cũ. Nên nếu đã được cho phép rồi thì đừng gọi,
   * còn nếu đã bị từ chối thì gọi cũng vô ích.
   */
  const { status: current } = await Notifications.getPermissionsAsync();
  let status = current;

  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status !== 'granted') return { ok: false, reason: 'denied' };

  await prepareAndroidChannel();

  /*
   * Lấy mã. Bước này GỌI MẠNG tới máy chủ Expo nên hỏng được: mất mạng, Wi-Fi
   * trường chặn, máy chủ Expo trả lỗi. Hỏng thì coi như lần này không có thông
   * báo, lần mở app sau thử lại — không ném lỗi ra ngoài làm sập chỗ gọi.
   */
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return { ok: true, token: data };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/*
 * ----------------------------------------------------------------------
 * HỢP ĐỒNG VỚI BACK-END
 *
 * Hai đường, cả hai đều đòi đăng nhập (header Authorization: Bearer <token>):
 *
 *   POST   /auth/push-token   { token, platform }   -> lưu mã theo user
 *   DELETE /auth/push-token   { token }             -> xoá mã khi đăng xuất
 *
 * Mã phải lưu thành MẢNG, không phải một trường đơn: một người dùng có thể có
 * điện thoại và máy tính bảng, lưu một trường thì máy đăng nhập sau đẩy mất
 * máy đăng nhập trước. Và phải lọc trùng — mở app mười lần thì gửi lên mười
 * lần cùng một mã.
 *
 * Lúc gửi thông báo, back-end gọi https://exp.host/--/api/v2/push/send với:
 *
 *   { to: '<mã>', title: '...', body: '...', data: { screen: 'Detail', id: '<id tin>' } }
 *
 * Phần data là thứ app đọc để biết chạm vào thì mở màn nào — xem readTarget().
 * Máy chủ Expo trả về status 'error' kèm details.error === 'DeviceNotRegistered'
 * cho những mã đã chết (app bị gỡ). Gặp cái đó thì back-end nên xoá mã đi,
 * không thì danh sách mã phình mãi và mỗi lượt gửi càng chậm.
 * ----------------------------------------------------------------------
 */

/*
 * Gửi mã lên back-end.
 *
 * Nuốt mọi lỗi và trả về true/false. Lý do: lúc viết hàm này back-end CHƯA CÓ
 * đường /auth/push-token, nên nó trả 404. Nếu để lỗi nổi lên thì mỗi lần đăng
 * nhập là một dòng đỏ trong log, và người đọc log sau này mất thời gian truy
 * một thứ vốn đã biết. Có đường rồi thì hàm này không cần sửa gì.
 */
export async function savePushToken(token: string): Promise<boolean> {
  try {
    await api.savePushToken({ token, platform: Platform.OS });
    return true;
  } catch {
    return false;
  }
}

/*
 * Xoá mã khi đăng xuất.
 *
 * Cần thiết, không phải cho gọn: máy này đăng xuất rồi mà back-end vẫn giữ mã
 * thì người dùng tiếp theo đăng nhập trên cùng máy sẽ nhận thông báo của người
 * trước — rò thông tin thật, không phải lỗi hình thức.
 */
export async function removePushToken(token: string): Promise<boolean> {
  try {
    await api.removePushToken(token);
    return true;
  } catch {
    return false;
  }
}

/*
 * Mã của máy này, nhớ lại sau khi đã gửi lên back-end thành công.
 *
 * Cần nhớ để lúc ĐĂNG XUẤT còn biết phải xoá mã nào. Không lấy lại bằng
 * getPushToken() được: lúc đăng xuất thì gọi lại hàm đó là một lượt gọi mạng
 * tới máy chủ Expo, mà người dùng đang chờ màn hình đổi.
 */
let currentToken: string | null = null;

/*
 * Xin quyền, lấy mã, gửi lên back-end — ba việc trong một lượt gọi.
 *
 * Gộp lại để chỗ gọi (App.tsx) không phải biết thứ tự ba bước. Trả về nguyên
 * kết quả của getPushToken để chỗ gọi vẫn nói được với người dùng vì sao không
 * có thông báo, nếu sau này muốn.
 */
export async function registerPushToken(): Promise<PushTokenResult> {
  const result = await getPushToken();
  if (!result.ok) return result;

  const saved = await savePushToken(result.token);

  // Chỉ nhớ khi back-end đã nhận. Nhớ một mã mà server không có thì lúc đăng
  // xuất mình gửi lệnh xoá một thứ không tồn tại.
  if (saved) currentToken = result.token;

  return result;
}

/*
 * Gỡ máy này khỏi danh sách nhận thông báo, dùng khi đăng xuất.
 *
 * PHẢI gọi TRƯỚC logout(), không phải sau: sau khi logout thì app đã xoá thẻ
 * đăng nhập, mà đường /auth/push-token đòi đăng nhập — lệnh xoá sẽ nhận 401 và
 * mã vẫn nằm lại trên server.
 */
export async function forgetPushToken(): Promise<void> {
  if (!currentToken) return;

  await removePushToken(currentToken);
  currentToken = null;
}

/** Màn hình mà một thông báo muốn mở. */
export type PushTarget = { screen: 'Detail'; id: string } | { screen: 'Chat' };

/*
 * Đọc phần data của thông báo ra màn hình cần mở.
 *
 * Viết thành hàm riêng, không nhét vào chỗ lắng nghe, vì đây là chỗ duy nhất
 * đọc dữ liệu TỪ BÊN NGOÀI vào — back-end gửi gì thì app nhận nấy. Tách ra thì
 * test được mà không cần dựng cả app, và mọi trường hợp dữ liệu méo đều có một
 * chỗ duy nhất để xử lý.
 *
 * Trả về null thì chỗ gọi không điều hướng đi đâu, chỉ mở app như bình thường.
 * Đó là hành vi đúng cho một thông báo không kèm data, và cũng là hàng rào cho
 * trường hợp back-end gửi sai tên màn: thà không nhảy đâu cả còn hơn gọi
 * navigate() với một tên màn không tồn tại rồi app sập.
 */
export function readTarget(data: unknown): PushTarget | null {
  if (!data || typeof data !== 'object') return null;

  const { screen, id } = data as { screen?: unknown; id?: unknown };

  if (screen === 'Detail' && typeof id === 'string' && id.length > 0) {
    return { screen: 'Detail', id };
  }

  if (screen === 'Chat') return { screen: 'Chat' };

  return null;
}

/*
 * Lắng nghe người dùng CHẠM vào thông báo.
 *
 * Trả về hàm dọn, để chỗ gọi gỡ đi khi component tháo. Không gỡ thì mỗi lần
 * component dựng lại là thêm một người lắng nghe, và một cú chạm làm app nhảy
 * màn nhiều lần.
 */
export function onNotificationTap(handle: (target: PushTarget) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const target = readTarget(response.notification.request.content.data);
    if (target) handle(target);
  });

  return () => sub.remove();
}

/*
 * Thông báo đã được chạm lúc app CHƯA CHẠY.
 *
 * Trường hợp này hay bị bỏ sót: app đang tắt hẳn, người dùng chạm vào thông
 * báo, hệ điều hành mở app lên. Lúc đó cú chạm đã xảy ra TRƯỚC khi
 * onNotificationTap kịp đăng ký, nên người lắng nghe không bao giờ thấy nó —
 * app mở ra ở trang chủ và người dùng không hiểu vì sao chạm vào tin mà không
 * ra tin.
 *
 * Hàm này hỏi lại cú chạm cuối cùng để bù đúng chỗ đó.
 */
export async function readTapThatOpenedApp(): Promise<PushTarget | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;

  return readTarget(response.notification.request.content.data);
}
