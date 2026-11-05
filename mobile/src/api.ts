import axios from 'axios';
import { API_URL, REQUEST_TIMEOUT } from './config';
import claim from './claim';
import { getToken, reportUnauthorized } from './context/auth';
import type {
  AdminReportPage,
  AdminStats,
  AnalyzeResult,
  AuthResult,
  ChatMessage,
  CleanupResult,
  MapPage,
  MatchResult,
  Pet,
  PetPage,
  ReportReason,
  User,
} from './types';

/*
 * Gọi back-end. Giống front-end-react/src/api.js, chỉ khác chỗ lấy địa chỉ
 * và cách gửi mã xác nhận.
 *
 * Phải có timeout: trên điện thoại, sai IP hoặc tường lửa chặn thì request treo
 * rất lâu rồi mới báo lỗi. Đặt timeout để app báo sớm, người dùng đỡ tưởng treo máy.
 * Con số cụ thể do config.js quyết định — máy chủ miễn phí cần chờ lâu hơn
 * nhiều vì nó phải thức dậy trước khi trả lời.
 */
const http = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
});

/*
 * Đã đăng nhập thì mọi request tự kèm token, server nhìn vào đó để biết ai
 * đang gọi. Chặn ở một chỗ duy nhất, các màn hình không phải nhớ gắn tay.
 */
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/*
 * Token hết hạn hoặc bị thu hồi -> server trả 401. Xoá phiên để giao diện
 * quay về trạng thái khách, thay vì cứ thử mãi với một token đã chết.
 */
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) reportUnauthorized();
    return Promise.reject(err);
  },
);

/*
 * Sửa và xoá cần mã xác nhận, gửi qua header x-claim-code.
 * Tin không có mã (tin cũ, tin seed) thì back-end vẫn cho qua, nên gửi header
 * rỗng cũng không sao — bỏ hẳn header cho gọn.
 *
 * Đã đăng nhập mà là chủ tin thì back-end cho qua bằng token, không cần mã.
 */
const withClaim = (claimCode?: string) =>
  claimCode ? { headers: { 'x-claim-code': claimCode } } : {};

/*
 * Tham số lọc gửi lên /pets và /admin/pets.
 *
 * Để lỏng (string | number) vì back-end nhận hết rồi tự chuyển đổi, nhưng
 * vẫn chặn được việc gõ sai TÊN tham số — đó mới là lỗi hay xảy ra.
 */
export interface PetQuery {
  limit?: number;
  skip?: number;
  sort?: string;
  type?: string;
  species?: string;
  area?: string;
  days?: string | number;
  resolved?: string;
  q?: string;
}

/*
 * Ảnh gửi lên phải đi kèm các trường khác nên luôn là FormData.
 * Sửa tin KHÔNG kèm ảnh thì gửi JSON thường được — nên nhận cả hai.
 */
type PetPayload = FormData | Record<string, unknown>;

/*
 * Lấy mã HTTP ra từ một lỗi bắt được.
 *
 * TypeScript khai biến trong catch là unknown — đúng, vì JavaScript ném được
 * bất cứ thứ gì, kể cả một chuỗi. Nên err.response?.status là đọc mò.
 *
 * axios.isAxiosError là hàm thu hẹp kiểu của chính axios: qua được nó thì
 * TypeScript biết chắc đây là lỗi của axios và có .response. Gom vào một chỗ
 * để mười mấy màn hình không phải mỗi nơi tự xoay một kiểu.
 */
export const errorStatus = (err: unknown): number | undefined =>
  axios.isAxiosError(err) ? err.response?.status : undefined;

export default {
  getPets: (params?: PetQuery) => http.get<PetPage>('/pets', { params }),

  /*
   * Mọi tin có toạ độ, để vẽ lên bản đồ. Nhận đúng bộ tham số của getPets —
   * cố ý, nếu không thì gõ chữ tìm kiếm rồi bấm sang bản đồ sẽ thấy cả những
   * tin vừa bị loại.
   *
   * Không phân trang: không thể vẽ nửa bản đồ rồi bắt người dùng bấm "xem
   * thêm". Back-end chặn ở 500 tin và báo lại bằng cờ capped.
   */
  petsForMap: (params?: PetQuery) => http.get<MapPage>('/pets/map', { params }),
  // Kèm mã xác nhận để server biết người xem có phải chủ bài không —
  // chủ bài thì nhận thêm trường đặc điểm bí mật. Mã lấy ở AsyncStorage nên
  // phải await, khác web đọc localStorage ra ngay.
  getPet: async (id: string) => http.get<Pet>(`/pets/${id}`, withClaim(await claim.get(id))),
  createPet: (data: PetPayload) => http.post<Pet>('/pets', data),
  updatePet: (id: string, data: PetPayload, claimCode?: string) =>
    http.put<Pet>(`/pets/${id}`, data, withClaim(claimCode)),
  deletePet: (id: string, claimCode?: string) =>
    http.delete<{ message: string }>(`/pets/${id}`, withClaim(claimCode)),

  /*
   * Báo cáo một tin đăng. CỐ Ý không cần đăng nhập, không cần mã xác nhận.
   *
   * Người cần báo cáo nhất là người không có tài khoản: họ không đăng tin
   * nào, chỉ bị kẻ khác lấy số điện thoại đem đi đăng tin giả. Bắt đăng nhập
   * mới cho báo cáo là chặn đúng người cần báo cáo nhất.
   *
   * Server không trả về tổng số báo cáo của tin đó, cố tình: biết con số ấy
   * thì kẻ xấu đoán được mình đã dồn đủ để tin bị gỡ hay chưa.
   */
  reportPet: (id: string, data: { reason: ReportReason; note?: string }) =>
    http.post<{ message: string }>(`/pets/${id}/report`, data),

  // AI. Phân tích ảnh mất 10-20 giây, lâu hơn hẳn request thường, nên nới
  // riêng thời gian chờ cho nó thay vì nới cho cả app.
  analyzeImage: (data: FormData) =>
    http.post<AnalyzeResult>('/ai/analyze-image', data, { timeout: 60000 }),

  // Đối chiếu lâu hơn phân tích ảnh nhiều: server phải tải về và so từng
  // ảnh ứng viên. Cho hẳn 2 phút.
  findMatches: (id: string) => http.get<MatchResult>(`/ai/match/${id}`, { timeout: 120000 }),

  // Trợ lý: gửi cả đoạn hội thoại lên mỗi lần, vì server không nhớ gì giữa
  // các lần gọi. Tối đa 20 lượt, mỗi tin 1000 ký tự.
  chat: (messages: ChatMessage[]) =>
    http.post<{ reply: string }>('/ai/chat', { messages }, { timeout: 60000 }),

  // Tài khoản
  register: (data: { name: string; email: string; password: string }) =>
    http.post<AuthResult>('/auth/register', data),
  login: (data: { email: string; password: string }) => http.post<AuthResult>('/auth/login', data),
  me: () => http.get<User>('/auth/me'),

  /*
   * Đăng nhập bằng Google / Facebook.
   *
   * App KHÔNG tự xác minh gì cả: nó chỉ lấy được một tờ giấy chứng nhận từ
   * Google hoặc Facebook rồi chuyển thẳng lên back-end. Back-end mới là nơi
   * hỏi lại Google/Facebook xem tờ giấy đó có thật không.
   *
   * Phải làm vậy vì app nằm trong tay người dùng — ai cũng mở ra sửa được.
   * Tin lời app nói "tôi là user X" là ai cũng đăng nhập thành ai cũng được.
   */
  /*
   * google/facebook: bật hay tắt nói chung.
   * googleMobile: back-end đã khai client ID riêng cho iOS và Android chưa.
   *
   * Phải tách ra vì Google bắt buộc mỗi nền tảng một mã riêng. Web bật rồi
   * không có nghĩa mobile dùng được — thiếu mã của nền tảng nào thì máy nền
   * tảng đó bấm vào sẽ bị Google từ chối.
   *
   * Trường này do back-end thêm riêng cho mobile, bản web không có.
   */
  authProviders: () =>
    http.get<{
      google: boolean;
      facebook: boolean;
      googleMobile?: { ios: boolean; android: boolean };
    }>('/auth/providers'),
  // credential = ID token của Google. Tên trường phải khớp đúng back-end.
  googleLogin: (data: { credential: string }) => http.post<AuthResult>('/auth/google', data),
  facebookLogin: (data: { accessToken: string }) =>
    http.post<AuthResult>('/auth/facebook', data),
  // Tra ve { pets, total } chu khong phai mang tran - xem list_my_pets
  // trong api/controllers/petController.js.
  myPets: () => http.get<PetPage>('/pets/mine'),

  /*
   * Quản trị. Back-end chặn cả ba đường này bằng requireAdmin, nên người
   * thường có gọi thẳng cũng chỉ nhận 403 — việc giấu nút đi ở màn Cài đặt
   * chỉ là cho gọn mắt, KHÔNG phải là lớp bảo vệ.
   */
  adminStats: () => http.get<AdminStats>('/admin/stats'),
  adminPets: (params?: PetQuery) => http.get<PetPage>('/admin/pets', { params }),
  // Quản trị viên xoá được bất kỳ tin nào, không cần mã xác nhận.
  adminDeletePet: (id: string) => http.delete<{ message: string }>(`/admin/pets/${id}`),

  /*
   * Báo cáo tin xấu, để quản trị viên xem lại.
   *
   * Trang bắt đầu từ 1 chứ không phải 0, khác mọi endpoint khác dùng skip —
   * đó là cách back-end khai, không phải nhầm.
   */
  adminReports: (page = 1) => http.get<AdminReportPage>('/admin/reports', { params: { page } }),

  /*
   * Dọn ngay những tin đã đoàn tụ quá hạn, kèm ảnh trên Cloudinary.
   *
   * Bình thường việc này do một lịch chạy tự động lo. Nút bấm tay ở trang
   * quản trị là để khỏi phải chờ tới đêm khi cần dọn gấp.
   *
   * Có thể chạy lâu: mỗi tin là một lệnh xoá ảnh gửi sang Cloudinary.
   */
  adminCleanup: () => http.post<CleanupResult>('/admin/cleanup', {}, { timeout: 120000 }),

  // Bỏ qua một báo cáo: xoá hẳn bản ghi báo cáo, KHÔNG đụng tới tin đăng.
  adminDismissReport: (id: string) =>
    http.delete<{ message: string }>(`/admin/reports/${id}`),
};
