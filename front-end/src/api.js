import axios from 'axios';
import claim from './claim';
import auth from './auth';
import { showToast } from './toast';
import { t } from './i18n';

const http = axios.create({ baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000' });

// Đã đăng nhập thì mọi request tự kèm token, server dùng nó để biết ai đang gọi.
http.interceptors.request.use((config) => {
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

// Token hết hạn hoặc bị thu hồi thì xoá phiên và NÓI RA.
//
// Trước đây chỉ lặng lẽ gọi auth.logout(). Các trang gọi API đều bắt lỗi rồi
// hiện trang rỗng, nên người dùng thấy "Tin của tôi" không có gì và không
// hiểu vì sao — trông như web hỏng, trong khi thật ra họ vừa bị đăng xuất.
//
// Tình huống này thành thường gặp từ khi đặt lại mật khẩu huỷ mọi phiên đang
// mở: đổi mật khẩu xong là token đang cầm trong tay hết hiệu lực ngay.
//
// Máy chủ đã nói rõ lý do trong body; dùng lại câu của nó thay vì đoán.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401 && auth.isLoggedIn()) {
      auth.logout();
      const message = err.response.data && err.response.data.message;
      showToast(message || t('auth.expired'), 'error');
    }
    return Promise.reject(err);
  }
);

// Sửa và xoá cần mã xác nhận của tin đó. Không có mã thì server trả 403.
const claimHeader = (id) => {
  const code = claim.get(id);
  return code ? { headers: { 'x-claim-code': code } } : {};
};

export default {
  getPets:   (params) => http.get('/pets', { params }),
  // Bản đồ có endpoint riêng vì nó cần mọi tin khớp bộ lọc cùng lúc, chỉ lấy
  // những trường vẽ ra được, và chỉ lấy tin đã ghim vị trí.
  getMapPets: (params) => http.get('/pets/map', { params }),
  // Kèm mã xác nhận để server biết người xem có phải chủ tin không —
  // chủ tin thì nhận thêm trường đặc điểm bí mật.
  getPet:    (id)     => http.get(`/pets/${id}`, claimHeader(id)),
  createPet: (data)   => http.post('/pets', data),
  updatePet: (id, data) => http.put(`/pets/${id}`, data, claimHeader(id)),
  deletePet: (id)     => http.delete(`/pets/${id}`, claimHeader(id)),
  reportPet: (id, data) => http.post(`/pets/${id}/report`, data),
  analyzeImage: (data) => http.post('/ai/analyze-image', data),
  // Đối chiếu nhiều ảnh nên lâu hơn hẳn các request khác, cho hạn rộng ra.
  findMatches: (id)   => http.get(`/ai/match/${id}`, { timeout: 120000 }),
  chat: (messages)    => http.post('/ai/chat', { messages }, { timeout: 60000 }),

  register: (data) => http.post('/auth/register', data),
  login:    (data) => http.post('/auth/login', data),
  forgotPassword: (data) => http.post('/auth/forgot-password', data),
  resetPassword:  (data) => http.post('/auth/reset-password', data),
  verifyEmail:        (data) => http.post('/auth/verify-email', data),
  resendVerification: (data) => http.post('/auth/resend-verification', data),
  me:       ()     => http.get('/auth/me'),
  authProviders:  ()     => http.get('/auth/providers'),
  googleLogin:    (data) => http.post('/auth/google', data),
  facebookLogin:  (data) => http.post('/auth/facebook', data),
  myPets:   ()     => http.get('/pets/mine'),

  adminStats:     ()       => http.get('/admin/stats'),
  adminPets:      (params) => http.get('/admin/pets', { params }),
  adminDeletePet: (id)     => http.delete(`/admin/pets/${id}`),
  adminCleanup:   ()       => http.post('/admin/cleanup'),
  adminReports:   (params) => http.get('/admin/reports', { params }),
  adminDismissReport: (id) => http.delete(`/admin/reports/${id}`),
};
