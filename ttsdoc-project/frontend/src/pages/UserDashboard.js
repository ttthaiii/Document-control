// filepath: /d:/OneDrive - T.T.S.Engineering(2004) Co., Ltd/TTSdoc/ttsdoc-project/frontend/src/pages/UserDashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css'; // Import CSS file
import api from '../services/api';
import { Helmet } from 'react-helmet';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [userSites, setUserSites] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบว่ามี token หรือไม่
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await api.get('/api/user/documents');
        
        if (response.data && response.data.data) {
          setUserData(response.data.data.user);
          setUserSites(response.data.data.sites);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
        setLoading(false);
        
        // ถ้า error เป็น 401 (Unauthorized) ให้กลับไปหน้า login
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
  <>
    <Helmet>
      <title>แดชบอร์ด | Document Control</title>
    </Helmet>

    <div className="dashboard-container">
      <div className="content-section">
        <div className="section-header">
          <h2>รายงาน</h2>
        </div>
      </div>
    </div>
  </>
  );
};

export default UserDashboard;