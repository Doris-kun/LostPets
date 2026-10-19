import axios from 'axios';

// Vue CLI: process.env.VUE_APP_API_URL  ->  Vite: import.meta.env.VITE_API_URL
const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

export default {
  getPets:   (params)   => http.get('/pets', { params }),
  getPet:    (id)       => http.get(`/pets/${id}`),
  createPet: (data)     => http.post('/pets', data),
  updatePet: (id, data) => http.put(`/pets/${id}`, data),
  deletePet: (id)       => http.delete(`/pets/${id}`),
};
