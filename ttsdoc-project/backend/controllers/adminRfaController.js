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
        // ...โค้ดตรวจสอบสถานะคงเดิม...

        if (!allowedStatuses.includes(selectedStatus)) {
            throw new Error('สถานะที่เลือกไม่ได้รับอนุญาต');
        }

        let newDocumentId = null;

        // อัพโหลดไฟล์ใหม่ (ถ้ามี)
        if (req.file) {
            console.log('Uploading file:', req.file.originalname);
            
            // ใช้ FileService แทนการเขียนโค้ดอัปโหลดโดยตรง
            const fileInfo = await FileService.uploadFile(userId, req.file);
            newDocumentId = fileInfo.documentId;
        }

        // อัพเดทสถานะเอกสาร
        await RfaModel.updateDocumentStatus(
            documentId, 
            selectedStatus, 
            userId, 
            newDocumentId
        );

        res.json({
            success: true,
            message: 'อัพเดทสถานะเอกสารสำเร็จ'
        });

    } catch (error) {
        console.error('Error in updateDocumentStatus:', error);
        
        // ทำความสะอาดไฟล์ที่อาจจะค้างอยู่
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