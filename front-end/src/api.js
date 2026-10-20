import axios from 'axios';

const http = axios.create({ baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000' });

export default {
  getPets:   (params) => http.get('/pets', { params }),
  getPet:    (id)     => http.get(`/pets/${id}`),
  createPet: (data)   => http.post('/pets', data),
  updatePet: (id, data) => http.put(`/pets/${id}`, data),
  deletePet: (id)     => http.delete(`/pets/${id}`),
  analyzeImage: (data) => http.post('/ai/analyze-image', data),
  // Đối chiếu nhiều ảnh nên lâu hơn hẳn các request khác, cho hạn rộng ra.
  findMatches: (id)   => http.get(`/ai/match/${id}`, { timeout: 120000 }),
};
