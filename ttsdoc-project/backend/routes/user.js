const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { pool } = require('../config/database');
const userController = require('../controllers/userController');  // เพิ่มส่วนนี้
const uploadController = require('../controllers/uploadController');  // เพิ่มส่วนนี้
const rfaController = require('../controllers/rfaController');
const adminRfaController = require('../controllers/adminRfaController');

const { 
  authenticateUser, 
  checkRFAAccess, 
  checkAdminAccess, 
  checkBIMAccess, 
  requireRFAAccess, 
  requireAdminAccess, 
  requireBIMAccess 
} = require('../middleware/roleMiddleware');

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB limit
    files: 10 // จำกัดจำนวนไฟล์ไม่เกิน 10 ไฟล์
  }
});

router.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'API is working!' });
});
  
// Auth routes - ไม่ต้องมี middleware
router.post('/auth/login', userController.handleLogin);

// Routes ที่ต้องการการยืนยันตัวตน
router.get('/documents', authenticateUser, userController.getUserDocuments);

// Dashboard routes
router.get('/dashboard', authenticateUser, userController.getDashboardData);
router.get('/approved-documents', authenticateUser, rfaController.getApprovedDocuments);

// Document Upload
router.post('/upload-document', authenticateUser, upload.fields([{ name: 'documents', maxCount: 10 }]), uploadController.uploadFile);

router.post('/rfa/update', 
  authenticateUser,
  checkRFAAccess,
  upload.array('documents', 10),
  checkBIMAccess, 
  rfaController.updateRFADocument
);

// RFA Routes
router.get('/rfa', authenticateUser, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/rfa/user-sites', authenticateUser, async (req, res) => {
  let connection;
  try {
      connection = await pool.getConnection();
      const userId = req.user.id;

      // เพิ่ม logging
      console.log('Fetching sites for user:', userId);

      const [sites] = await connection.query(`
          SELECT DISTINCT s.id, s.site_name 
          FROM sites s
          INNER JOIN user_sites us ON s.id = us.site_id
          WHERE us.user_id = ?
          ORDER BY s.site_name ASC
      `, [userId]);

      // เพิ่ม logging
      console.log('Sites found:', sites);

      res.json({
          success: true,
          sites: sites
      });

  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
          success: false,
          error: 'Failed to fetch sites'
      });
  } finally {
      if (connection) connection.release();
  }
});


router.get('/rfa/categories/:siteId', requireRFAAccess, rfaController.getCategories);

router.get('/rfa/check-document', requireRFAAccess, rfaController.checkExistingDocument);

router.post('/rfa/upload', 
  requireRFAAccess,
  upload.any(),
  rfaController.uploadRFADocument
);

// Admin routes
router.get('/rfa/documents', requireAdminAccess, adminRfaController.getDocumentsByPosition);
router.get('/rfa/search', requireAdminAccess, adminRfaController.searchDocuments);
router.post('/rfa/update-status', 
  requireAdminAccess,
  upload.array('documents', 10),
  adminRfaController.updateDocumentStatus
);

router.get('/rfa/documents/:siteId', requireRFAAccess, rfaController.getRFADocuments);

// RFI and Work Request routes - แก้ไขให้ใช้ middleware ใหม่
router.get('/rfi', authenticateUser, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/work-request', authenticateUser, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Logout route - แก้ไขให้ใช้ middleware ใหม่
router.post('/logout', authenticateUser, (req, res) => {
  // สามารถจัดเก็บบันทึกการออกจากระบบได้ที่นี่
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;