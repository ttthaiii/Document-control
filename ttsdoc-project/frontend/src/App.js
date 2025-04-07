import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/Layout/MainLayout'; 
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import RfaDashboard from './pages/RfaDashboard';  // เพิ่ม import RfaDashboard
import Rfi from './pages/Rfi';
import WorkRequest from './pages/WorkRequest';
import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // ถ้า token เป็น JWT, สามารถแยกส่วนข้อมูลผู้ใช้ได้
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
          
          // ตั้งค่าข้อมูลผู้ใช้จาก payload
          setUser({
            id: payload.id,
            username: payload.username,
            jobPosition: payload.jobPosition || payload.job_position
          });
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/rfa-dashboard" element={<RfaDashboard user={user} />} />
            <Route path="/rfa-bim" element={<Navigate to="/rfa-dashboard" replace />} />
            <Route path="/rfa-admin" element={<Navigate to="/rfa-dashboard" replace />} />
            <Route path="/rfi" element={<Rfi />} />
            <Route path="/work-request" element={<WorkRequest />} />
          </Route>
        </Routes>
      </ErrorBoundary>  
    </BrowserRouter>
  );
}

export default App;