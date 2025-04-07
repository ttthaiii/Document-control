// ttsdoc-project/backend/models/documentModel.js
const Database = require('./database');

class DocumentModel {
  /**
   * สร้างเอกสารใหม่
   * @param {number} userId - ID ของผู้ใช้
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} fileUrl - URL ของไฟล์
   * @param {string} googleFileId - ID ไฟล์ใน Google Drive
   * @param {string} mimeType - ประเภทของไฟล์
   * @param {number} fileSize - ขนาดไฟล์ (ถ้ามี)
   * @returns {Promise<number>} - ID ของเอกสารที่สร้างขึ้น
   */
  static async createDocument(userId, fileName, fileUrl, googleFileId, mimeType = null, fileSize = null) {
    return Database.transaction(async (connection) => {
      const [result] = await connection.query(
        'INSERT INTO documents (user_id, file_name, file_url, file_size, mime_type, google_file_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, fileName, fileUrl, fileSize, mimeType, googleFileId]
      );
      
      return result.insertId;
    });
  }

  /**
   * สร้างไฟล์เอกสาร RFA
   * @param {number} rfaDocumentId - ID ของเอกสาร RFA
   * @param {number} userId - ID ของผู้ใช้
   * @param {string} fileName - ชื่อไฟล์
   * @param {string} fileUrl - URL ของไฟล์
   * @param {string} googleFileId - ID ไฟล์ใน Google Drive
   * @param {string} fileType - ประเภทของไฟล์
   * @returns {Promise<number>} - ID ของไฟล์ที่สร้างขึ้น
   */
  static async createRfaDocumentFile(rfaDocumentId, userId, fileName, fileUrl, googleFileId, fileType) {
    return Database.transaction(async (connection) => {
      const [result] = await connection.query(`
        INSERT INTO rfa_document_files 
        (rfa_document_id, user_id, file_name, file_url, google_file_id, file_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        rfaDocumentId,
        userId,
        fileName,
        fileUrl,
        googleFileId,
        fileType
      ]);
      
      return result.insertId;
    });
  }

  /**
   * ดึงเอกสารตาม ID
   * @param {number} documentId - ID ของเอกสาร
   * @returns {Promise<Object|null>} - ข้อมูลเอกสาร
   */
  static async getDocumentById(documentId) {
    const documents = await Database.query('SELECT * FROM documents WHERE id = ?', [documentId]);
    return documents.length ? documents[0] : null;
  }
}

module.exports = DocumentModel;