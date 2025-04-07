// สร้างไฟล์ใหม่: ttsdoc-project/backend/middleware/roleMiddleware.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ค่าคงที่สำหรับตำแหน่งงานที่อนุญาต
const RFA_AUTHORIZED_POSITIONS = ['BIM', 'Adminsite', 'OE', 'CM', 'Adminsite2'];
const ADMIN_POSITIONS = ['Adminsite', 'Adminsite2', 'CM'];

// ฟังก์ชันสำหรับตรวจสอบและตั้งค่า user จาก token
const authenticateUser = async (req, res, next) => {
  try {
    // 1. ตรวจสอบ token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // 2. ตรวจสอบ token และตั้งค่าข้อมูลผู้ใช้
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // 3. ตรวจสอบตำแหน่งงาน (ถ้าไม่มีในข้อมูล user)
    if (!req.user.jobPosition) {
      const [userData] = await pool.query(
        'SELECT job_position FROM users WHERE id = ?',
        [req.user.id]
      );
      
      if (userData.length > 0 && userData[0].job_position) {
        req.user.jobPosition = userData[0].job_position;
      } else {
        // ตำแหน่งงานไม่พบ แต่ยังคงมีสิทธิ์ในการเข้าถึง
        req.user.jobPosition = null;
      }
    }
    
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// ฟังก์ชันตรวจสอบสิทธิ์ตามตำแหน่งงาน
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.jobPosition) {
      return res.status(403).json({ success: false, error: 'Unauthorized: No job position found' });
    }
    
    if (allowedRoles.includes(req.user.jobPosition)) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: `Unauthorized: ${req.user.jobPosition} role is not allowed` 
    });
  };
};

// สร้าง middleware ตามกลุ่มสิทธิ์ที่ใช้บ่อย
const checkRFAAccess = checkRole(RFA_AUTHORIZED_POSITIONS);
const checkAdminAccess = checkRole(ADMIN_POSITIONS);
const checkBIMAccess = checkRole(['BIM']);

// middleware ที่รวมการตรวจสอบทั้งหมดสำหรับ RFA
const requireRFAAccess = [authenticateUser, checkRFAAccess];
const requireAdminAccess = [authenticateUser, checkAdminAccess];
const requireBIMAccess = [authenticateUser, checkBIMAccess];

module.exports = {
  authenticateUser,
  checkRole,
  checkRFAAccess,
  checkAdminAccess,
  checkBIMAccess,
  requireRFAAccess,
  requireAdminAccess,
  requireBIMAccess,
  // export ค่าคงที่เพื่อให้ไฟล์อื่นสามารถใช้ได้
  RFA_AUTHORIZED_POSITIONS,
  ADMIN_POSITIONS
};