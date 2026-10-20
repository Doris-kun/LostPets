import { Platform } from 'react-native';

/*
 * Địa chỉ back-end.
 *
 * ĐÂY LÀ CHỖ HAY SAI NHẤT khi làm app điện thoại.
 *
 * Trên web, 'localhost' là chính máy tính đang mở trình duyệt -> chạy ngon.
 * Trên điện thoại, 'localhost' là CHÍNH CÁI ĐIỆN THOẠI — mà điện thoại đâu có
 * chạy back-end. Nên phải trỏ tới địa chỉ IP của máy tính trong mạng LAN.
 *
 * Điều kiện: điện thoại và máy tính phải chung một mạng Wi-Fi.
 */

// IP máy tính trong mạng LAN. Đổi mạng Wi-Fi khác là IP đổi theo, phải sửa lại.
// Xem IP hiện tại: mở PowerShell gõ  ipconfig  rồi tìm dòng IPv4 Address.
const LAN_IP = '172.20.10.4';

const PORT = 3000;

/*
 * CÔNG TẮC: đang chạy trên máy ảo Android hay điện thoại thật?
 *
 *   true  -> máy ảo Android Studio. Dùng 10.0.2.2, KHÔNG cần quan tâm IP hay Wi-Fi.
 *   false -> điện thoại thật qua Expo Go. Dùng LAN_IP ở trên.
 *
 * Máy ảo cũng là một máy riêng, nên 'localhost' với nó là chính nó chứ không
 * phải laptop. Google quy ước 10.0.2.2 trỏ ngược về máy thật.
 */
const USE_ANDROID_EMULATOR = false;

const useEmulatorHost = USE_ANDROID_EMULATOR && Platform.OS === 'android';

export const API_URL = useEmulatorHost
  ? `http://10.0.2.2:${PORT}`
  : `http://${LAN_IP}:${PORT}`;

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
