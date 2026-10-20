import axios from 'axios';
import { API_URL } from './config';

/*
 * Gọi back-end. Giống front-end-react/src/api.js, chỉ khác chỗ lấy địa chỉ
 * và cách gửi mã xác nhận.
 *
 * timeout 15 giây: trên điện thoại, sai IP hoặc tường lửa chặn thì request treo
 * rất lâu rồi mới báo lỗi. Đặt timeout để app báo sớm, người dùng đỡ tưởng treo máy.
 */
const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

/*
 * Sửa và xoá cần mã xác nhận, gửi qua header x-claim-code.
 * Tin không có mã (tin cũ, tin seed) thì back-end vẫn cho qua, nên gửi header
 * rỗng cũng không sao — bỏ hẳn header cho gọn.
 */
const withClaim = (claimCode) => (claimCode ? { headers: { 'x-claim-code': claimCode } } : {});

export default {
  getPets: (params) => http.get('/pets', { params }),
  getPet: (id) => http.get(`/pets/${id}`),
  createPet: (data) => http.post('/pets', data),
  updatePet: (id, data, claimCode) => http.put(`/pets/${id}`, data, withClaim(claimCode)),
  deletePet: (id, claimCode) => http.delete(`/pets/${id}`, withClaim(claimCode)),
};
