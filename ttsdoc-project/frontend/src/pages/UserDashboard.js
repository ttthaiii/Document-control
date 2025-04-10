import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Helmet } from 'react-helmet';
import ApprovedDocumentTable from '../components/shared/ApprovedDocumentTable';

const UserDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [userData, setUserData] = useState(null);
  const [userSites, setUserSites] = useState([]);
  const [approvedDocuments, setApprovedDocuments] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) navigate('/');
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // แยกการเรียก API เป็น 2 ส่วน
      const userResponse = await api.get('/api/user/dashboard');
      
      if (userResponse.data?.success && userResponse.data?.data) {
        setUserData(userResponse.data.data.user);
        setUserSites(userResponse.data.data.sites);
        
        // ตั้งค่า default เป็น site แรก ถ้ามี
        if (userResponse.data.data.sites.length > 0 && !selectedSiteId) {
          setSelectedSiteId(userResponse.data.data.sites[0].id.toString());
        }
      }
      
      // เรียก API เอกสารที่อนุมัติแล้ว
      const docsResponse = await api.get('/api/user/approved-documents');
      
      if (docsResponse.data?.success) {
        setApprovedDocuments(docsResponse.data.documents || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
      
      // ถ้า token หมดอายุหรือไม่ถูกต้อง ให้กลับไปหน้า login
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  // กรองเอกสารตาม site ที่เลือก
  const filteredDocuments = selectedSiteId 
    ? approvedDocuments.filter(doc => doc.site_id === parseInt(selectedSiteId))
    : approvedDocuments;

  return (
    <div className="dashboard-container">
      <Helmet>
        <title>Dashboard - Approved Documents</title>
      </Helmet>

      <div className="dashboard-header">
        <h1>เอกสารที่ได้รับการอนุมัติแล้ว</h1>
      </div>

      <div className="content-section">
        {loading ? (
          <div className="loading-spinner">กำลังโหลดข้อมูล...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {/* Dropdown สำหรับเลือกโครงการ */}
            <div className="site-filter">
              <label htmlFor="site-select">เลือกโครงการ:</label>
              <select
                id="site-select"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="site-select"
              >
                <option value="">ทั้งหมด</option>
                {userSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ตารางแสดงเอกสารที่อนุมัติแล้ว */}
            <ApprovedDocumentTable documents={filteredDocuments} />
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
