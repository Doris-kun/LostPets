import axios from 'axios';
import { API_URL, REQUEST_TIMEOUT } from './config';
import claim from './claim';
import { getToken, reportUnauthorized } from './context/auth';
import type {
  AdminStats,
  AnalyzeResult,
  AuthResult,
  ChatMessage,
  MatchResult,
  Pet,
  PetPage,
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
  // Kèm mã xác nhận để server biết người xem có phải chủ bài không —
  // chủ bài thì nhận thêm trường đặc điểm bí mật. Mã lấy ở AsyncStorage nên
  // phải await, khác web đọc localStorage ra ngay.
  getPet: async (id: string) => http.get<Pet>(`/pets/${id}`, withClaim(await claim.get(id))),
  createPet: (data: PetPayload) => http.post<Pet>('/pets', data),
  updatePet: (id: string, data: PetPayload, claimCode?: string) =>
    http.put<Pet>(`/pets/${id}`, data, withClaim(claimCode)),
  deletePet: (id: string, claimCode?: string) =>
    http.delete<{ message: string }>(`/pets/${id}`, withClaim(claimCode)),

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
};
