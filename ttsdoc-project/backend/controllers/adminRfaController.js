// ttsdoc-project/backend/controllers/adminRfaController.js (บางส่วน)
const FileService = require('../services/fileService');
const fs = require('fs').promises;
const RfaModel = require('../models/rfaModel');
const DocumentModel = require('../models/documentModel'); // สมมติว่ามีไฟล์นี้
const driveService = require('../config/googleDrive');

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
      if (position === 'BIM') {
        allowedStatuses = ['แก้ไข', 'ไม่อนุมัติ', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)'];
      } else if (position === 'Adminsite') {
        allowedStatuses = ['ส่ง CM', 'แก้ไข'];
      } else if (position === 'Adminsite2') {
        allowedStatuses = ['ส่ง CM', 'แก้ไข'];
      } else if (position === 'CM') {
        allowedStatuses = [
          'อนุมัติ',
          'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
          'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
          'ไม่อนุมัติ'
        ];
      } else {
        throw new Error('ตำแหน่งงานไม่ถูกต้อง');
      }
  
      if (!allowedStatuses.includes(selectedStatus)) {
        throw new Error('สถานะที่เลือกไม่ได้รับอนุญาต');
      }
  
      let newDocumentId = null;
  
      // อัพโหลดไฟล์ใหม่ (ถ้ามี)
      if (req.file) {
        console.log('Uploading file:', req.file.originalname);
        const fileInfo = await FileService.uploadFile(userId, req.file);
        newDocumentId = fileInfo.documentId;
      }
  
      // ✅ โหลดสถานะเดิมจาก DB
      const document = await RfaModel.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ success: false, error: 'ไม่พบเอกสาร' });
      }
      
      const prevStatus = document.status;
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // ✅ เตรียมข้อมูลอัปเดต
      const updateFields = {
        status: selectedStatus,
        updated_by: userId,
        previous_status: prevStatus // เพิ่มบรรทัดนี้
      };
      
      // เพิ่มเงื่อนไขวันที่ส่ง Shop
      if (prevStatus === 'แก้ไข' && selectedStatus === 'BIM ส่งแบบ') {
        updateFields.shop_date = currentDate;
      }
      
      // ✅ เงื่อนไขวันที่ส่งอนุมัติ
      if (prevStatus === 'BIM ส่งแบบ' && selectedStatus === 'ส่ง CM') {
        updateFields.send_approval_date = currentDate;
      }
      
      // ✅ เงื่อนไขวันที่อนุมัติ
      const approvalStatuses = [
        'อนุมัติ',
        'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
        'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
        'ไม่อนุมัติ'
      ];
      if (approvalStatuses.includes(selectedStatus)) {
        updateFields.approval_date = currentDate;
      }
  
      // ✅ อัปเดต revision_id ถ้ามีไฟล์แนบใหม่
      if (newDocumentId) {
        updateFields.revision_id = newDocumentId;
      }
  
      // ✅ เรียก update ที่ model
      await RfaModel.updateDocumentFields(documentId, updateFields);
  
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