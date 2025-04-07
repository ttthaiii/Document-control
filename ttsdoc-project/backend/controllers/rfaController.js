// ttsdoc-project/backend/controllers/rfaController.js
const fs = require('fs').promises;
const { pool } = require('../config/database');
const driveService = require('../config/googleDrive');
const { uploadFile } = require('./uploadController');

const FileService = require('../services/fileService');
// นำเข้า Model ที่เกี่ยวข้อง
const RfaModel = require('../models/rfaModel');
const CategoryModel = require('../models/categoryModel');
const DocumentModel = require('../models/documentModel');
const UserModel = require('../models/userModel');

const EDITABLE_STATUSES = ['แก้ไข', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ'];
const initialStatus = "BIM ส่งแบบ";

// ตรวจสอบการอนุญาต RFA - คงไว้ แต่อาจย้ายไปที่ roleMiddleware ในอนาคต
const checkRFAPermission = (jobPosition) => {
    const authorizedPositions = ['BIM', 'Adminsite', 'OE', 'CM'];
    return authorizedPositions.includes(jobPosition);
};

// ฟังก์ชันอัปโหลดเอกสาร RFA
const uploadRFADocument = async (req, res) => {
  try {
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);

    if (!checkRFAPermission(req.user.jobPosition)) {
      throw new Error('ไม่มีสิทธิ์ในการอัพโหลดเอกสาร RFA');
    }

    if (!req.files || req.files.length === 0) {
      throw new Error('กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์');
    }

    const { siteId, fullDocumentNumber, revisionNumber, title } = req.body;

    if (!siteId || !fullDocumentNumber || !revisionNumber || !title) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบฟอร์มอีกครั้ง');
    }

    // แยกหมวดงานและเลขที่เอกสารจาก fullDocumentNumber
    const parts = fullDocumentNumber.split('-');
    const categoryCode = parts.length > 1 ? parts[0] : '';
    const documentNumber = parts.length > 1 ? parts[1] : fullDocumentNumber;

    // ตรวจสอบเอกสารซ้ำ
    const existingDocs = await RfaModel.checkExistingDocument(siteId, fullDocumentNumber);
    if (existingDocs.length > 0) {
      throw new Error('เอกสารนี้มีอยู่ในระบบแล้ว');
    }

    // ค้นหา category_id
    const categoryId = await CategoryModel.getCategoryId(categoryCode, siteId);
    if (!categoryId) {
      throw new Error(`ไม่พบรหัสหมวดหมู่ '${categoryCode}' ในระบบ`);
    }

    // สร้างเอกสาร RFA
    const rfaDocumentId = await RfaModel.createRfaDocument(
      siteId,
      categoryId,
      documentNumber,
      revisionNumber,
      req.user.id,
      title,
      fullDocumentNumber,
      initialStatus
    );

    // อัปโหลดไฟล์ทั้งหมด (ใช้ FileService)
    for (const file of req.files) {
      await FileService.uploadRfaDocumentFile(rfaDocumentId, req.user.id, file);
    }

    res.json({
      success: true,
      message: 'อัปโหลดเอกสารสำเร็จ',
      rfaId: rfaDocumentId
    });

  } catch (error) {
    console.error('Error in uploadRFADocument:', error);
    
    // ทำความสะอาดไฟล์ที่อาจจะค้างอยู่
    if (req.files && req.files.length > 0) {
      await FileService.cleanupFailedUploads(req.files.map(file => file.path));
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงรายการโครงการที่ user มีสิทธิ์เข้าถึง
const getUserSites = async (req, res) => {
  try {
    // ใช้ UserModel แทนการเขียน SQL โดยตรง
    const sites = await UserModel.getUserSites(req.user.id);
    res.json({ success: true, sites });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user sites' });
  }
};

// ดึงหมวดงานตามโครงการ
const getCategories = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('Getting categories for site:', siteId);

    // ใช้ CategoryModel แทนการเขียน SQL โดยตรง
    const categories = await CategoryModel.getCategoriesBySite(siteId);
    
    console.log('Categories found:', categories);
    return res.json({ 
      success: true, 
      categories: categories || [] 
    });

  } catch (error) {
    console.error('Error in getCategories:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ตรวจสอบเอกสารซ้ำ
const checkExistingDocument = async (req, res) => {
  try {
    if (!checkRFAPermission(req.user.jobPosition)) { 
      return res.status(403).json({ 
        success: false, 
        error: 'ไม่มีสิทธิ์ในการตรวจสอบเอกสาร RFA' 
      });
    }

    const { siteId, fullDocumentNumber } = req.query;
    
    console.log('Checking document:', { siteId, fullDocumentNumber });
    
    if (!siteId || !fullDocumentNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // ค้นหาเอกสาร RFA โดยใช้ Model
    const documents = await RfaModel.checkExistingDocument(siteId, fullDocumentNumber);

    console.log('Found documents:', documents.length);

    if (documents.length > 0) {
      const doc = documents[0];
      console.log('Latest document status:', doc.status);
      
      const canEdit = EDITABLE_STATUSES.includes(doc.status);
      
      return res.json({
        success: true,
        exists: true,
        documents: [doc],
        canEdit: canEdit
      });
    }

    res.json({ 
      success: true, 
      exists: false,
      documents: [] 
    });

  } catch (error) {
    console.error('Error in checkExistingDocument:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// เพิ่มหมวดหมู่
const addCategory = async (req, res) => {
  try {
    const { siteId, categoryName, categoryCode, description } = req.body;
    
    // ใช้ CategoryModel แทนการเขียน SQL โดยตรง
    await CategoryModel.createCategory(siteId, categoryName, categoryCode, description);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงเอกสาร RFA ตามไซต์
const getRFADocuments = async (req, res) => {
  try {
    console.log('req.user in getRFADocuments:', req.user);
    
    const { siteId } = req.params;
    // ถ้า req.user เป็น undefined หรือ null ให้ตรวจสอบ token โดยตรง
    const userId = req.user?.id || null;
    
    if (!userId) {
      console.error('User ID is missing');
      return res.status(401).json({
        success: false,
        error: 'User authentication failed'
      });
    }
    
    // ตรวจสอบสิทธิ์การเข้าถึงไซต์
    const userSites = await UserModel.getUserSitesById(userId, siteId);
    if (userSites.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this site'
      });
    }

    // ใช้ RfaModel แทนการเขียน SQL โดยตรง
    const documents = await RfaModel.getDocumentsBySite(siteId);

    return res.json({ success: true, documents });

  } catch (error) {
    console.error('Error details:', {
      error: error.message,
      stack: error.stack,
      siteId: req.params.siteId
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch documents: ' + error.message
    });
  }
};

// อัปเดทเอกสาร RFA
const updateRFADocument = async (req, res) => {
  try {
    console.log('Request files:', req.files ? req.files.length : 'No files');
    console.log('Request body:', req.body);
    
    if (!checkRFAPermission(req.user.jobPosition)) {
      return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ในการอัปเดตเอกสาร RFA' });
    }

    const { documentId, status } = req.body;
    if (!req.files || req.files.length === 0 || !documentId) {
      return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    // ดึงเอกสารเดิม
    const document = await RfaModel.getDocumentById(documentId);
    if (!document) throw new Error('ไม่พบเอกสาร');
    
    let newDocumentId = documentId;
    let newRevisionNumber = document.revision_number;

    // ถ้าสถานะเป็น "ไม่อนุมัติ" ให้สร้างเอกสารใหม่แทนการอัปเดต
    if (document.status === 'ไม่อนุมัติ') {
      // เพิ่ม revision number
      const rev = parseInt(document.revision_number || '0');
      newRevisionNumber = (rev + 1).toString().padStart(2, '0');
      
      // สร้างเอกสารใหม่
      newDocumentId = await RfaModel.createNewRevision(
        document,
        newRevisionNumber,
        req.user.id,
        status || 'BIM ส่งแบบ'
      );
    } else {
      // อัปเดตเอกสารเดิม
      await RfaModel.updateDocumentStatus(
        documentId,
        status || 'BIM ส่งแบบ',
        req.user.id
      );
    }

    // อัปโหลดไฟล์ทั้งหมด (ใช้ FileService)
    for (const file of req.files) {
      await FileService.uploadRfaDocumentFile(newDocumentId, req.user.id, file);
    }

    res.json({
      success: true,
      message: 'อัพเดทเอกสารสำเร็จ',
      data: {
        originalDocumentId: documentId,
        newDocumentId: newDocumentId,
        newRevisionNumber
      }
    });

  } catch (error) {
    console.error('Error in updateRFADocument:', error);
    
    // ทำความสะอาดไฟล์ที่อาจจะค้างอยู่
    if (req.files && req.files.length > 0) {
      await FileService.cleanupFailedUploads(req.files.map(file => file.path));
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
    checkRFAPermission,
    uploadRFADocument,
    getUserSites,   
    getCategories,  
    checkExistingDocument,
    addCategory,
    getRFADocuments,
    updateRFADocument
};