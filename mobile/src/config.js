import { NativeModules, Platform } from 'react-native';

/*
 * Địa chỉ back-end.
 *
 * ĐÂY LÀ CHỖ HAY SAI NHẤT khi làm app điện thoại.
 *
 * Trên web, 'localhost' là chính máy tính đang mở trình duyệt -> chạy ngon.
 * Trên điện thoại, 'localhost' là CHÍNH CÁI ĐIỆN THOẠI — mà điện thoại đâu có
 * chạy back-end. Nên phải trỏ tới địa chỉ IP của máy tính trong mạng LAN.
 */

/*
 * CÔNG TẮC CHÍNH: dùng máy chủ thật trên Internet hay back-end chạy ở laptop?
 *
 *   true  -> PRODUCTION_URL. App chạy được ở BẤT CỨ ĐÂU, không cần laptop bật,
 *            không cần chung Wi-Fi. Đây là thứ cần khi đưa app cho thầy hoặc
 *            bạn bè mang về nhà.
 *   false -> back-end chạy ở laptop. Dùng khi đang sửa back-end và muốn thử ngay.
 */
const USE_PRODUCTION = false;

/*
 * Địa chỉ back-end đã deploy.
 *
 * CHƯA ĐIỀN. Cách tìm:
 *   - Hỏi bạn cùng nhóm, hoặc
 *   - Vào dashboard.render.com, mở dịch vụ back-end, copy dòng địa chỉ ở đầu trang
 *
 * Lưu ý: https://lostpets-1.onrender.com KHÔNG phải địa chỉ này — đó là bản
 * web Vue đã deploy, không phải API. Mở /pets trên đó trả về HTML chứ không
 * phải JSON, nên điền vào đây là app hỏng.
 *
 * Điền xong nhớ đổi USE_PRODUCTION thành true.
 */
const PRODUCTION_URL = '';

/*
 * Địa chỉ web đã deploy — dùng cho nút Chia sẻ, để người nhận bấm vào link là
 * mở được tin trên trình duyệt mà không cần cài app.
 */
export const WEB_URL = 'https://lostpets-1.onrender.com';

const PORT = 3000;

/*
 * TỰ TÌM ĐỊA CHỈ MÁY TÍNH — bỏ hẳn việc sửa IP bằng tay mỗi lần đổi Wi-Fi.
 *
 * Mẹo: app đang chạy thì chính nó vừa tải mã JavaScript về từ Metro — máy chủ
 * phát triển chạy trên laptop. React Native có giữ lại đường dẫn đã tải, dạng:
 *
 *     http://192.168.1.9:8081/index.bundle?platform=ios&dev=true
 *
 * Cắt lấy phần ở giữa là ra đúng IP laptop trong mạng hiện tại. Không cần cài
 * thư viện nào, không cần đoán, không bao giờ lạc hậu.
 *
 * Trả về null trong hai trường hợp, lúc đó rơi về LAN_IP bên dưới:
 *   - Bản APK thật: mã nằm sẵn trong máy, đường dẫn là file:// chứ không phải http
 *   - Máy ảo Android: trả về 10.0.2.2, vốn đã đúng sẵn nên cũng không sao
 */
function detectHost() {
  const url = NativeModules?.SourceCode?.scriptURL;
  if (typeof url !== 'string') return null;

  const match = /^https?:\/\/([^:/]+)/.exec(url);
  return match ? match[1] : null;
}

// Địa chỉ dự phòng, chỉ dùng khi tự tìm không ra.
// Xem IP hiện tại: mở PowerShell gõ  ipconfig  rồi tìm dòng IPv4 Address.
const LAN_IP = '192.168.1.5';

/*
 * CÔNG TẮC PHỤ: ép dùng địa chỉ máy ảo Android.
 * Thường không cần bật, vì máy ảo đã tự trả về 10.0.2.2 rồi.
 *
 * Máy ảo cũng là một máy riêng, nên 'localhost' với nó là chính nó chứ không
 * phải laptop. Google quy ước 10.0.2.2 trỏ ngược về máy thật.
 */
const USE_ANDROID_EMULATOR = false;

const host =
  USE_ANDROID_EMULATOR && Platform.OS === 'android' ? '10.0.2.2' : detectHost() || LAN_IP;

const localUrl = `http://${host}:${PORT}`;

// Bật production mà quên điền địa chỉ thì quay về dùng laptop, còn hơn là
// gọi vào chuỗi rỗng rồi báo lỗi khó hiểu.
export const API_URL = USE_PRODUCTION && PRODUCTION_URL ? PRODUCTION_URL : localUrl;

/*
 * Máy chủ trên gói miễn phí của Render NGỦ khi 15 phút không ai gọi. Lần gọi
 * đánh thức nó mất 20-40 giây. Nên khi dùng production phải chờ lâu hơn hẳn,
 * không thì lần mở app đầu tiên trong ngày luôn báo lỗi mạng.
 */
export const REQUEST_TIMEOUT = USE_PRODUCTION ? 60000 : 15000;

/*
 * Nếu app báo "Network Error", kiểm tra theo thứ tự:
 *   1. Back-end đã chạy chưa (cd back-end && npm start)
 *   2. Điện thoại và máy tính có chung Wi-Fi không
 *   3. Wi-Fi có phải mạng công cộng không — quán cà phê, trường học, khách sạn
 *      thường bật "cách ly máy khách", các thiết bị không nhìn thấy nhau. Không
 *      có cách vượt qua, phải dùng hotspot điện thoại
 *   3. IP ở trên còn đúng không (gõ ipconfig kiểm tra lại)
 *   4. Tường lửa Windows có chặn cổng 3000 không — đây là thủ phạm phổ biến,
 *      lần đầu chạy Windows thường hỏi "Allow access", phải bấm Allow
 *   5. Mở trình duyệt TRÊN ĐIỆN THOẠI vào http://<IP>:3000/pets, thấy JSON
 *      là mạng thông, lỗi nằm ở chỗ khác
 */
