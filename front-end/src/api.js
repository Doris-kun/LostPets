import axios from 'axios';
import claim from './claim';
import auth from './auth';

const http = axios.create({ baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000' });

// Đã đăng nhập thì mọi request tự kèm token, server dùng nó để biết ai đang gọi.
http.interceptors.request.use((config) => {
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

// Token hết hạn hoặc bị thu hồi thì xoá phiên để giao diện quay về trạng thái khách.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401 && auth.isLoggedIn()) auth.logout();
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
  getPet:    (id)     => http.get(`/pets/${id}`),
  createPet: (data)   => http.post('/pets', data),
  updatePet: (id, data) => http.put(`/pets/${id}`, data, claimHeader(id)),
  deletePet: (id)     => http.delete(`/pets/${id}`, claimHeader(id)),
  analyzeImage: (data) => http.post('/ai/analyze-image', data),
  // Đối chiếu nhiều ảnh nên lâu hơn hẳn các request khác, cho hạn rộng ra.
  findMatches: (id)   => http.get(`/ai/match/${id}`, { timeout: 120000 }),
  chat: (messages)    => http.post('/ai/chat', { messages }, { timeout: 60000 }),

  register: (data) => http.post('/auth/register', data),
  login:    (data) => http.post('/auth/login', data),
  me:       ()     => http.get('/auth/me'),
  myPets:   ()     => http.get('/pets/mine'),
};
