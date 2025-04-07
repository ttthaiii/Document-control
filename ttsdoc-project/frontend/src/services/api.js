// frontend/src/services/api.js
import axios from 'axios';

// กำหนด baseURL ให้เหมาะสมกับทั้งใน development และ production
// ใน development ใช้ proxy จาก package.json (ไม่ต้องระบุ baseURL)
// ใน production ระบุ baseURL เป็น API URL ถ้ามีการตั้งค่าใน environment
const baseURL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_URL || window.location.origin) 
  : '';

console.log('API baseURL:', baseURL); // เพิ่ม logging เพื่อ debug

const api = axios.create({
  baseURL: baseURL,
  withCredentials: false,
  timeout: 30000,
});

// เพิ่ม token ในทุก request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  console.log(`API Request to: ${config.baseURL}${config.url}`); // เพิ่ม logging เพื่อ debug
  return config;
});

// จัดการกับ response errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('API Error:', error.response.data);
      
      // ถ้า token หมดอายุหรือไม่ถูกต้อง ให้ logout
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    } else {
      console.error('API Request failed:', error.message);
    }
    return Promise.reject(error);
  }
);

export const login = async (credentials) => {
  try {
    console.log('Sending login request with credentials:', credentials);
    
    // สำคัญ: ใช้ instance api ที่สร้างไว้แล้ว ไม่ใช่ axios โดยตรง
    const response = await api.post('/api/user/auth/login', credentials);
    
    console.log('Login response:', response.data);
    
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message || error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // ไม่จำเป็นต้องเรียก API logout เมื่อใช้ JWT
  window.location.href = '/';
};

// เพิ่ม helper function เพื่อตรวจสอบการเชื่อมต่อ API
export const testApiConnection = async () => {
  try {
    const response = await api.get('/api/user/ping');
    console.log('API Connection test:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Connection error:', error.message);
    throw error;
  }
};

export default api;