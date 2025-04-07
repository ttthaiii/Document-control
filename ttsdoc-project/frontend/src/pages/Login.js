// filepath: /d:/OneDrive - T.T.S.Engineering(2004) Co., Ltd/TTSdoc/ttsdoc-project/frontend/src/pages/Login.js
import React, { useState } from 'react';
import './Login.css'; // Import CSS file
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { Helmet } from 'react-helmet';

const Login = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');

      try {
        const response = await login(credentials);
        
        if (response.success) {
          // การเก็บ token จัดการในฟังก์ชัน login แล้ว
          navigate('/dashboard');
        } else {
          setError(response.error || 'Login failed');
        }
      } catch (error) {
        setError(error.response?.data?.error || 'Invalid username or password');
      }
    };
  
    return (
    <>
      <Helmet>
        <title>เข้าสู่ระบบ | Document Control</title>
      </Helmet>    
        
      <div className="login-page">
        <div className="login-container">
          <form onSubmit={handleSubmit} className="login-form">
            <h2>Login</h2>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({
                  ...credentials,
                  username: e.target.value
                })}
                required
              />
            </div>
    
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({
                  ...credentials,
                  password: e.target.value
                })}
                required
              />
            </div>
    
            <button type="submit">Login</button>
          </form>
        </div>
      </div> 
    </> 
    );
  };
  
  export default Login;