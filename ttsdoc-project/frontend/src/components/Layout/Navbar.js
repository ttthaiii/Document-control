import React from 'react';
import './Layout.css';

const Navbar = ({ onToggleSidebar }) => {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <button onClick={onToggleSidebar} className="toggle-btn">
          ☰
        </button>
        <span className="app-name">Document Control</span>
      </div>

      <div className="navbar-right">
        <div className="company-info">
          <img 
            src={require('../../assets/logo.png')}
            alt="TTS Engineering Logo" 
            className="company-logo"
          />
          <span className="company-name">
            T.T.S. ENGINEERING(2004).CO.,LTD
          </span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;