import axios from 'axios';
import { API_URL, REQUEST_TIMEOUT } from './config';
import claim from './claim';
import { getToken, reportUnauthorized } from './context/auth';

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
const withClaim = (claimCode) => (claimCode ? { headers: { 'x-claim-code': claimCode } } : {});

export default {
  getPets: (params) => http.get('/pets', { params }),
  // Kèm mã xác nhận để server biết người xem có phải chủ bài không —
  // chủ bài thì nhận thêm trường đặc điểm bí mật. Mã lấy ở AsyncStorage nên
  // phải await, khác web đọc localStorage ra ngay.
  getPet: async (id) => http.get(`/pets/${id}`, withClaim(await claim.get(id))),
  createPet: (data) => http.post('/pets', data),
  updatePet: (id, data, claimCode) => http.put(`/pets/${id}`, data, withClaim(claimCode)),
  deletePet: (id, claimCode) => http.delete(`/pets/${id}`, withClaim(claimCode)),

  // Tài khoản
  register: (data) => http.post('/auth/register', data),
  login: (data) => http.post('/auth/login', data),
  me: () => http.get('/auth/me'),
  myPets: () => http.get('/pets/mine'),
};
