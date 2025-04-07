const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require("../config/database");

// ฟังก์ชันล็อกอิน
const login = async (username, password) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ? AND active = 1',
      [username, password]  // หมายเหตุ: ควรใช้การเข้ารหัสในการเปรียบเทียบรหัสผ่าน
    );
    
    if (rows && rows.length > 0) {
      const user = rows[0];
      return user;
    }
    return null;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// จัดการการล็อกอิน
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await login(username, password);
    
    if (user) {
      // อัพเดท last_login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      // ดึงข้อมูล sites ที่ผู้ใช้มีสิทธิ์เข้าถึง
      const [userSites] = await pool.query(
        'SELECT DISTINCT s.* FROM sites s ' +
        'INNER JOIN user_sites us ON s.id = us.site_id ' +
        'WHERE us.user_id = ?',
        [user.id]
      );
      
      // สร้าง JWT token
      const token = jwt.sign(
        { 
          id: user.id,
          username: user.username,
          role: user.role,
          jobPosition: user.job_position 
        },
        req.app.get('jwt-secret'),
        { expiresIn: '24h' } // token หมดอายุใน 24 ชั่วโมง
      );
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          jobPosition: user.job_position,
          sites: userSites
        },
        token: token
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// ดึงข้อมูลเอกสารของผู้ใช้
const getUserDocuments = async (req, res) => {
  try {
    // ข้อมูลผู้ใช้มาจาก JWT token ที่ถูกตรวจสอบแล้ว
    const userId = req.user.id;

    // ดึงข้อมูลผู้ใช้อีกครั้งเพื่อให้ได้ข้อมูลล่าสุด
    const [userData] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    // ดึงข้อมูล sites
    const [sites] = await pool.query(
      'SELECT DISTINCT s.* FROM sites s ' +
      'INNER JOIN user_sites us ON s.id = us.site_id ' +
      'WHERE us.user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: userId,
          username: req.user.username,
          role: req.user.role,
          jobPosition: userData[0]?.job_position || req.user.jobPosition
        },
        sites: sites || []
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// ดึงข้อมูล Dashboard
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // ดึงข้อมูลผู้ใช้
    const [userData] = await pool.query(
      'SELECT id, username, role, job_position, email FROM users WHERE id = ?',
      [userId]
    );

    // ดึงข้อมูล sites
    const [userSites] = await pool.query(
      'SELECT s.* FROM sites s ' +
      'INNER JOIN user_sites us ON s.id = us.site_id ' +
      'WHERE us.user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      data: {
        user: userData[0],
        sites: userSites
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  handleLogin,
  getUserDocuments,
  getDashboardData
};