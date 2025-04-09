// ttsdoc-project/backend/controllers/adminRfaController.js (บางส่วน)
const FileService = require('../services/fileService');
const fs = require('fs').promises;
const RfaModel = require('../models/rfaModel');
const DocumentModel = require('../models/documentModel'); // สมมติว่ามีไฟล์นี้
const driveService = require('../config/googleDrive');
const Database = require('../models/database'); 
// ดึงเอกสารตามตำแหน่งและสถานะที่กำหนด
const getDocumentsByPosition = async (req, res) => {
    try {
        console.log('Request headers:', req.headers);
        console.log('Request user object:', req.user);
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        
        const userId = req.user.id;
        const position = req.user.jobPosition;
        
        console.log('getDocumentsByPosition called with user:', req.user);
        console.log('User position:', position);

        // กำหนดสถานะตามตำแหน่งงาน
        let statusFilter;
        switch(position) {
            case 'Adminsite':
                statusFilter = ['BIM ส่งแบบ'];
                break;
            case 'Adminsite2':
                statusFilter = ['BIM ส่งแบบ', 'ส่ง CM'];
                break;
            case 'CM':
                statusFilter = ['ส่ง CM'];
                break;
            default:
                throw new Error('ตำแหน่งงานไม่ถูกต้อง');
        }

        console.log('Status filter:', statusFilter);

        // ใช้ Model แทนการเขียน SQL โดยตรง
        const documents = await RfaModel.getDocumentsByPosition(userId, statusFilter);

        console.log('Found documents:', documents.length);

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Error in getDocumentsByPosition:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ค้นหาเอกสาร
const searchDocuments = async (req, res) => {
    try {
        const { searchTerm } = req.query;
        const userId = req.user.id;
        const position = req.user.jobPosition;

        console.log('searchDocuments called:', { searchTerm, userId, position });

        // กำหนดสถานะตามตำแหน่งงาน
        let statusFilter;
        switch(position) {
            case 'Adminsite':
                statusFilter = ['BIM ส่งแบบ'];
                break;
            case 'Adminsite2':
                statusFilter = ['BIM ส่งแบบ', 'ส่ง CM'];
                break;
            case 'CM':
                statusFilter = ['ส่ง CM'];
                break;
            default:
                throw new Error('ตำแหน่งงานไม่ถูกต้อง');
        }

        // ใช้ Model แทนการเขียน SQL โดยตรง
        const documents = await RfaModel.searchDocuments(userId, statusFilter, searchTerm);
        
        console.log('Search results:', documents.length);

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Error in searchDocuments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// อัพเดทสถานะเอกสาร
const updateDocumentStatus = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { documentId, selectedStatus } = req.body;
    const userId = req.user.id;
    const position = req.user.jobPosition;

    console.log('updateDocumentStatus called:', { documentId, selectedStatus, position });

    // ตรวจสอบสถานะที่อนุญาตตามตำแหน่งงาน
    let allowedStatuses;
    // [ส่วนของการตรวจสอบสถานะคงเดิม...]

    // โหลดสถานะเดิมจาก DB
    const document = await RfaModel.getDocumentById(documentId);
    if (!document) {
      console.log('Document not found:', documentId);
      return res.status(404).json({ success: false, error: 'ไม่พบเอกสาร' });
    }
    
    console.log('Current document state:', document);
    
    const prevStatus = document.status;
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // เตรียมข้อมูลอัปเดต - ไม่ใช้ previous_status อีกต่อไป
    const updateFields = {
      status: selectedStatus,
      updated_by: userId,
      updated_at: currentDate
    };
    
    console.log('Update fields prepared:', updateFields);
    
    // เพิ่มเงื่อนไขวันที่ส่ง Shop
    if (prevStatus === 'แก้ไข' && selectedStatus === 'BIM ส่งแบบ') {
      updateFields.shop_date = currentDate;
    }
    
    // เงื่อนไขวันที่ส่งอนุมัติ
    if (prevStatus === 'BIM ส่งแบบ' && selectedStatus === 'ส่ง CM') {
      updateFields.send_approval_date = currentDate;
      console.log('Setting send_approval_date:', currentDate);
    }
    
    // เงื่อนไขวันที่อนุมัติ
    const approvalStatuses = [
      'อนุมัติ',
      'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
      'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
      'ไม่อนุมัติ'
    ];
    if (approvalStatuses.includes(selectedStatus)) {
      updateFields.approval_date = currentDate;
    }

    // อัปเดต revision_id ถ้ามีไฟล์แนบใหม่
    let newDocumentId = null;
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileInfo = await FileService.uploadRfaDocumentFile(documentId, userId, file, selectedStatus);
          newDocumentId = fileInfo.documentId;
        }
      }

    // เรียก update ที่ model
    console.log('Calling updateDocumentFields with:', { documentId, updateFields });
    const updateResult = await RfaModel.updateDocumentFields(documentId, updateFields);
    console.log('Update result:', updateResult);

    // เพิ่มบันทึกลงฐานข้อมูล - ใช้ model หรือ Database.query ก็ได้
    await Database.query(`
      INSERT INTO upload_logs (user_id, rfa_document_id, status, created_at)
      VALUES (?, ?, ?, NOW())
    `, [userId, documentId, 'status_updated']);

    res.json({
      success: true,
      message: 'อัปเดตสถานะเอกสารสำเร็จ'
    });

  } catch (error) {
    console.error('Error in updateDocumentStatus:', error);
    
    // ลบไฟล์ชั่วคราวถ้ามี
    if (req.file?.path) {
      await FileService.deleteTemporaryFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export ฟังก์ชันทั้งหมด
module.exports = {
    getDocumentsByPosition,
    searchDocuments,
    updateDocumentStatus
};