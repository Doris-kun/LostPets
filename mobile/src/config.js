import { Platform } from 'react-native';

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

// IP máy tính trong mạng LAN. Đổi mạng Wi-Fi khác là IP đổi theo, phải sửa lại.
// Xem IP hiện tại: mở PowerShell gõ  ipconfig  rồi tìm dòng IPv4 Address.
const LAN_IP = '192.168.20.244';

const PORT = 3000;

/*
 * CÔNG TẮC PHỤ: đang chạy trên máy ảo Android hay điện thoại thật?
 * Chỉ có tác dụng khi USE_PRODUCTION = false.
 *
 *   true  -> máy ảo Android Studio. Dùng 10.0.2.2, KHÔNG cần quan tâm IP hay Wi-Fi.
 *   false -> điện thoại thật qua Expo Go. Dùng LAN_IP ở trên.
 *
 * Máy ảo cũng là một máy riêng, nên 'localhost' với nó là chính nó chứ không
 * phải laptop. Google quy ước 10.0.2.2 trỏ ngược về máy thật.
 */
const USE_ANDROID_EMULATOR = false;

const useEmulatorHost = USE_ANDROID_EMULATOR && Platform.OS === 'android';

const localUrl = useEmulatorHost
  ? `http://10.0.2.2:${PORT}`
  : `http://${LAN_IP}:${PORT}`;

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
 *   3. IP ở trên còn đúng không (gõ ipconfig kiểm tra lại)
 *   4. Tường lửa Windows có chặn cổng 3000 không — đây là thủ phạm phổ biến,
 *      lần đầu chạy Windows thường hỏi "Allow access", phải bấm Allow
 *   5. Mở trình duyệt TRÊN ĐIỆN THOẠI vào http://<IP>:3000/pets, thấy JSON
 *      là mạng thông, lỗi nằm ở chỗ khác
 */
