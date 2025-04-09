// ttsdoc-project/backend/services/fileService.js
const fs = require('fs').promises;
const path = require('path');
const driveService = require('../config/googleDrive');
const DocumentModel = require('../models/documentModel');
const Database = require('../models/database');

class FileService {
  /**
   * อัปโหลดไฟล์ไปยัง Google Drive และบันทึกข้อมูลในฐานข้อมูล
   * @param {number} userId - ID ของผู้ใช้
   * @param {Object} file - ข้อมูลไฟล์ที่ได้จาก multer
   * @returns {Promise<Object>} - ข้อมูลเอกสารที่บันทึกแล้ว
   */
  static async uploadFile(userId, file) {
    try {
      // ถอดรหัสชื่อไฟล์ให้เป็น UTF-8 (สำหรับชื่อไฟล์ภาษาไทย)
      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      // อัปโหลดไฟล์ไปยัง Google Drive
      const uploadResult = await driveService.uploadToDrive(
        userId,
        file.path,
        fileName,
        file.mimetype
      );
      
      // บันทึกข้อมูลลงฐานข้อมูล
      const documentId = await DocumentModel.createDocument(
        userId,
        fileName,
        uploadResult.webViewLink,
        uploadResult.id,
        file.mimetype,
        file.size
      );
      
      // ลบไฟล์ชั่วคราว
      await this.deleteTemporaryFile(file.path);
      
      // ส่งคืนข้อมูลที่จำเป็น
      return {
        documentId,
        fileName,
        fileUrl: uploadResult.webViewLink,
        googleFileId: uploadResult.id
      };
    } catch (error) {
      // ในกรณีที่เกิดข้อผิดพลาด ให้ลบไฟล์ชั่วคราว
      await this.deleteTemporaryFile(file.path);
      throw error;
    }
  }
  
  /**
   * อัปโหลดไฟล์หลายไฟล์
   * @param {number} userId - ID ของผู้ใช้
   * @param {Array} files - รายการไฟล์
   * @returns {Promise<Array>} - รายการข้อมูลเอกสาร
   */
  static async uploadMultipleFiles(userId, files) {
    const results = [];
    
    for (const file of files) {
      const result = await this.uploadFile(userId, file);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * บันทึกไฟล์เอกสาร RFA
   * @param {number} rfaDocumentId - ID ของเอกสาร RFA
   * @param {number} userId - ID ของผู้ใช้
   * @param {Object} file - ข้อมูลไฟล์ที่ได้จาก multer
   * @returns {Promise<Object>} - ข้อมูลเอกสารที่บันทึกแล้ว
   */
  static async uploadRfaDocumentFile(rfaDocumentId, userId, file, status = null) {
    try {
      // ถอดรหัสชื่อไฟล์ให้เป็น UTF-8
      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      // อัปโหลดไฟล์ไปยัง Google Drive
      const uploadResult = await driveService.uploadToDrive(
        userId,
        file.path,
        fileName,
        file.mimetype
      );
      
      // ดึงสถานะปัจจุบันของเอกสาร
      if (!status) {
        throw new Error('Missing required document status');
      }
      const currentStatus = status;
      
      console.log('Uploading file with status:', currentStatus);
      
      // บันทึกข้อมูลไฟล์พร้อมสถานะ
      await Database.query(`
        INSERT INTO rfa_document_files
        (rfa_document_id, document_status, file_name, file_url, google_file_id, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        rfaDocumentId,
        currentStatus, // บันทึกสถานะที่ส่งมาหรือสถานะปัจจุบัน
        fileName,
        uploadResult.webViewLink,
        uploadResult.id,
        userId
      ]);
      
      // อัพเดตวันที่ในตาราง rfa_documents
      await Database.query(`
        UPDATE rfa_documents 
        SET updated_at = NOW() 
        WHERE id = ?
      `, [rfaDocumentId]);
      
      // ลบไฟล์ชั่วคราว
      await this.deleteTemporaryFile(file.path);
      
      // ส่งคืนข้อมูล
      return {
        documentId: rfaDocumentId,
        fileId: uploadResult.id,
        fileName,
        fileUrl: uploadResult.webViewLink
      };
    } catch (error) {
      // ลบไฟล์ชั่วคราว
      await this.deleteTemporaryFile(file.path);
      throw error;
    }
  }
  
  /**
   * ลบไฟล์ชั่วคราว
   * @param {string} filePath - พาธของไฟล์ที่ต้องการลบ
   * @returns {Promise<void>}
   */
  static async deleteTemporaryFile(filePath) {
    try {
      if (filePath) {
        await fs.unlink(filePath);
        console.log(`Temporary file deleted: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error deleting temporary file: ${filePath}`, error);
      // ไม่ throw error เนื่องจากเป็นการดำเนินการที่ไม่สำคัญต่อการทำงานหลัก
    }
  }
  
  /**
   * สร้างไดเร็กทอรีชั่วคราวสำหรับเก็บไฟล์อัปโหลด
   * @returns {Promise<void>}
   */
  static async ensureUploadDirectory() {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.access(uploadDir);
    } catch (error) {
      // ถ้าไดเร็กทอรีไม่มีอยู่ ให้สร้างใหม่
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('Upload directory created:', uploadDir);
    }
  }
  
  /**
   * จัดการการอัปโหลดไฟล์ที่ไม่สำเร็จ
   * @param {Array} filePaths - รายการพาธของไฟล์ที่ต้องการลบ
   * @returns {Promise<void>}
   */
  static async cleanupFailedUploads(filePaths) {
    for (const filePath of filePaths) {
      await this.deleteTemporaryFile(filePath);
    }
  }
}

module.exports = FileService;