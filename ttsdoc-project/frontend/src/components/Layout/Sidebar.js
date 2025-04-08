import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Layout.css';

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [userSites, setUserSites] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRfaDropdown, setShowRfaDropdown] = useState(false);

  // ย้ายฟังก์ชันมาไว้ข้างบน
  const isRFAAuthorized = () => {
    const authorizedPositions = ['BIM', 'Adminsite', 'OE', 'CM', 'Adminsite2'];
    return authorizedPositions.includes(userData?.jobPosition);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleRfaDropdown = () => {
    setShowRfaDropdown(!showRfaDropdown);
  };

  useEffect(() => {
    // ดึงข้อมูลจาก localStorage ก่อน
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUserData(storedUser);
    }

    const fetchData = async () => {
      try {
        const response = await api.get('/api/user/documents');
        if (response.data.success) {
          const { user, sites } = response.data.data;
          setUserData(user);
          setUserSites(sites || []);
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="user-info">
        <h3>Welcome {userData?.username}</h3>
        <p>Position: {userData?.jobPosition}</p>
        <p>Site: {userSites.map((site, index) => (
          <span key={site.id}>
            {site.site_name}
            {index < userSites.length - 1 ? ', ' : ''}
          </span>
        ))}</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📊</span>
          <span>Dashboard</span>
        </NavLink>

        {isRFAAuthorized() && (
          <div className="nav-group">
            <div className={`nav-item dropdown-toggle ${showRfaDropdown ? 'active' : ''}`} onClick={toggleRfaDropdown}>
              <span className="icon">📑</span>
              <span>RFA</span>
              <span style={{ marginLeft: 'auto' }}>{showRfaDropdown ? '▼' : '▶'}</span>
            </div>
            <div className={`dropdown-content ${showRfaDropdown ? 'show' : ''}`}>
              <NavLink 
                to="/rfa-dashboard" 
                className={({isActive}) => `nav-subitem ${isActive ? 'active' : ''}`}
              >
                Shopdrawing
              </NavLink>
            </div>
          </div>
        )}

        <NavLink to="/rfi" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">❓</span>
          <span>RFI</span>
        </NavLink>

        <NavLink to="/work-request" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📝</span>
          <span>Work Request</span>
        </NavLink>
      </nav>

      {isOpen && (
        <button onClick={handleLogout} className="logout-btn">
          ออกจากระบบ
        </button>
      )}
    </div>
  );
};

export default Sidebar;