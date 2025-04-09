// ttsdoc-project/backend/models/rfaModel.js
const Database = require('./database');

class RfaModel {
  /**
   * ดึงเอกสาร RFA ตามตำแหน่งงานและสถานะ
   * @param {number} userId - ID ของผู้ใช้
   * @param {Array} statusFilter - รายการสถานะที่ต้องการกรอง
   * @returns {Promise<Array>} - รายการเอกสาร
   */
  static async getDocumentsByPosition(userId, statusFilter) {
    // ตรวจสอบว่ามีคอลัมน์ updated_by หรือไม่
    const hasUpdatedByColumn = await Database.hasColumn('rfa_documents', 'updated_by');
    
    // สร้าง query ตามโครงสร้างตาราง
    let query = `
      SELECT 
        rd.id,
        wc.category_code,
        rd.document_number,
        rd.revision_number,
        rd.title,
        rd.status,
        d.file_url,
        DATE_FORMAT(rd.created_at, '%d/%m/%Y') as created_at,
        ${hasUpdatedByColumn ? 'DATE_FORMAT(rd.updated_at, "%d/%m/%Y") as updated_at,' : ''}
        u.username as created_by_name
    `;

    // เพิ่ม updated_by_name ถ้ามีคอลัมน์ updated_by
    if (hasUpdatedByColumn) {
      query += `, u2.username as updated_by_name`;
    }

    query += `
      FROM rfa_documents rd
      JOIN documents d ON rd.document_id = d.id
      JOIN work_categories wc ON rd.category_id = wc.id
      JOIN users u ON rd.created_by = u.id
    `;

    // เพิ่ม LEFT JOIN กับตาราง users สำหรับ updated_by ถ้ามี
    if (hasUpdatedByColumn) {
      query += ` LEFT JOIN users u2 ON rd.updated_by = u2.id`;
    }

    query += `
      JOIN user_sites us ON rd.site_id = us.site_id
      WHERE us.user_id = ?
      AND rd.status IN (?)
      ORDER BY rd.created_at DESC
    `;

    return Database.query(query, [userId, statusFilter]);
  }

/**
 * สร้างเอกสาร RFA
 * @param {number} siteId - ID ของไซต์
 * @param {number} categoryId - ID ของหมวดหมู่
 * @param {string} documentNumber - เลขที่เอกสาร
 * @param {string} revisionNumber - หมายเลข revision
 * @param {number} userId - ID ของผู้ใช้
 * @param {string} title - ชื่อเอกสาร
 * @param {string} fullDocumentNumber - เลขที่เอกสารเต็ม
 * @param {string} status - สถานะเอกสาร
 * @returns {Promise<number>} - ID ของเอกสารที่สร้างขึ้น
 */
static async createRfaDocument(siteId, categoryId, documentNumber, revisionNumber, userId, title, fullDocumentNumber, status = 'BIM ส่งแบบ') {
    return Database.transaction(async (connection) => {
      const [result] = await connection.query(`
        INSERT INTO rfa_documents 
        (site_id, category_id, document_number, revision_number, created_by, updated_by, title, status, full_document_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        siteId, 
        categoryId,
        documentNumber, 
        revisionNumber, 
        userId, 
        userId, 
        title, 
        status, 
        fullDocumentNumber
      ]);
      
      return result.insertId;
    });
  }
  
  /**
   * ดึงเอกสาร RFA ตาม ID
   * @param {number} documentId - ID ของเอกสาร
   * @returns {Promise<Object|null>} - ข้อมูลเอกสาร
   */
  static async getDocumentById(documentId) {
    const documents = await Database.query('SELECT * FROM rfa_documents WHERE id = ?', [documentId]);
    return documents.length ? documents[0] : null;
  }
  
  /**
   * สร้าง revision ใหม่ของเอกสาร
   * @param {Object} document - ข้อมูลเอกสารเดิม
   * @param {string} newRevisionNumber - หมายเลข revision ใหม่
   * @param {number} userId - ID ของผู้ใช้
   * @param {string} status - สถานะเอกสาร
   * @returns {Promise<number>} - ID ของเอกสารที่สร้างขึ้น
   */
  static async createNewRevision(document, newRevisionNumber, userId, status) {
    return Database.transaction(async (connection) => {
      // สร้างเอกสารใหม่
      const [result] = await connection.query(`
        INSERT INTO rfa_documents 
        (site_id, category_id, document_number, revision_number, created_by, updated_by, title, status, full_document_number, previous_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        document.site_id,
        document.category_id,
        document.document_number,
        newRevisionNumber,
        userId,
        userId,
        document.title,
        status,
        document.full_document_number,
        null // ไม่มี previous_status สำหรับเอกสารใหม่
      ]);
      
      // ทำเครื่องหมายเอกสารเก่าว่ามี revision ใหม่แล้ว
      await connection.query(
        'UPDATE rfa_documents SET has_newer_revision = TRUE WHERE id = ?',
        [document.id]
      );
      
      return result.insertId;
    });
  }

  /**
   * ค้นหาเอกสาร RFA
   * @param {number} userId - ID ของผู้ใช้
   * @param {Array} statusFilter - รายการสถานะที่ต้องการกรอง
   * @param {string} searchTerm - คำค้นหา
   * @returns {Promise<Array>} - รายการเอกสารที่ค้นพบ
   */
  static async searchDocuments(userId, statusFilter, searchTerm) {
    // ตรวจสอบว่ามีคอลัมน์ updated_by หรือไม่
    const hasUpdatedByColumn = await Database.hasColumn('rfa_documents', 'updated_by');
    
    // แยกหมวดงานและเลขที่เอกสาร (ถ้ามี)
    let categoryCode = null;
    let documentNumber = null;
    const docMatch = searchTerm.match(/^([A-Za-z]+)[\s-]?(\d+)$/);
    
    if (docMatch) {
      categoryCode = docMatch[1];
      documentNumber = docMatch[2];
    }
    
    // สร้าง query พร้อมเพิ่ม updated_by ถ้ามี
    let query = `
      SELECT 
        rd.id,
        wc.category_code,
        rd.document_number,
        rd.revision_number,
        rd.title,
        rd.status,
        d.file_url,
        DATE_FORMAT(rd.created_at, '%d/%m/%Y') as created_at,
        ${hasUpdatedByColumn ? 'DATE_FORMAT(rd.updated_at, "%d/%m/%Y") as updated_at,' : ''}
        u.username as created_by_name
    `;

    // เพิ่ม updated_by_name ถ้ามีคอลัมน์ updated_by
    if (hasUpdatedByColumn) {
      query += `, u2.username as updated_by_name`;
    }

    query += `
      FROM rfa_documents rd
      JOIN documents d ON rd.document_id = d.id
      JOIN work_categories wc ON rd.category_id = wc.id
      JOIN users u ON rd.created_by = u.id
    `;

    // เพิ่ม LEFT JOIN กับตาราง users สำหรับ updated_by ถ้ามี
    if (hasUpdatedByColumn) {
      query += ` LEFT JOIN users u2 ON rd.updated_by = u2.id`;
    }

    query += `
      JOIN user_sites us ON rd.site_id = us.site_id
      WHERE us.user_id = ?
      AND rd.status IN (?)
    `;

    const params = [userId, statusFilter];

    if (categoryCode && documentNumber) {
      query += ` AND wc.category_code = ? AND rd.document_number = ?`;
      params.push(categoryCode, documentNumber);
    } else {
      query += ` AND (rd.title LIKE ? OR CONCAT(wc.category_code, '-', rd.document_number) LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ` ORDER BY rd.created_at DESC`;

    return Database.query(query, params);
  }

  /**
   * อัพเดทสถานะเอกสาร
   * @param {number} documentId - ID ของเอกสาร
   * @param {string} selectedStatus - สถานะที่ต้องการอัพเดท
   * @param {number} userId - ID ของผู้ใช้
   * @param {number} newDocumentId - ID ของเอกสารใหม่ (ถ้ามี)
   * @returns {Promise<boolean>} - true ถ้าอัพเดทสำเร็จ
   */
  static async updateDocumentStatus(documentId, selectedStatus, userId, newDocumentId = null) {
    return Database.transaction(async (connection) => {
      // ตรวจสอบสถานะซ้ำ
      const [existingStatus] = await connection.query(
        'SELECT status FROM rfa_documents WHERE id = ? AND status = ?',
        [documentId, selectedStatus]
      );

      if (existingStatus.length > 0) {
        throw new Error('เอกสารนี้มีสถานะนี้อยู่แล้ว');
      }

      // ตรวจสอบว่ามีคอลัมน์ updated_by หรือไม่
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM rfa_documents LIKE 'updated_by'
      `);
      
      const hasUpdatedByColumn = columns.length > 0;

      // อัพเดทข้อมูล RFA โดยใช้ document ID ที่ถูกต้อง
      const targetDocId = newDocumentId || documentId;
      
      // อัพเดทเฉพาะสถานะ พร้อมกับ updated_by ถ้ามี
      if (hasUpdatedByColumn) {
        await connection.query(
          'UPDATE rfa_documents SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
          [selectedStatus, userId, targetDocId]
        );
      } else {
        await connection.query(
          'UPDATE rfa_documents SET status = ? WHERE id = ?',
          [selectedStatus, targetDocId]
        );
      }
      
      return true;
    });
  }

  /**
   * ดึงเอกสาร RFA ตามไซต์
   * @param {number} siteId - ID ของไซต์
   * @returns {Promise<Array>} - รายการเอกสาร
   */
  static async getDocumentsBySite(siteId) {
    const documents = [];
    
    // ดึงข้อมูลเอกสาร RFA
    const rfaDocs = await Database.query(`
      SELECT 
        r.id,
        r.document_number,
        r.revision_number,
        r.status,
        r.previous_status,
        r.title,
        r.full_document_number, 
        DATE_FORMAT(r.created_at, '%d/%m/%Y') as created_at,
        DATE_FORMAT(r.shop_date, '%d/%m/%Y') as shop_date,
        DATE_FORMAT(r.send_approval_date, '%d/%m/%Y') as send_approval_date,
        DATE_FORMAT(r.approval_date, '%d/%m/%Y') as approval_date,
        r.has_newer_revision,
        u.username as created_by_name,
        uu.username as updated_by_name,
        wc.category_name,
        wc.category_code,
        DATE_FORMAT(r.updated_at, '%d/%m/%Y') as updated_at
      FROM rfa_documents r
      JOIN users u ON r.created_by = u.id
      LEFT JOIN users uu ON r.updated_by = uu.id
      LEFT JOIN work_categories wc ON r.category_id = wc.id 
      WHERE r.site_id = ?
      ORDER BY r.created_at DESC
    `, [siteId]);
    
    // ดึงข้อมูลไฟล์แนบสำหรับแต่ละเอกสาร - แก้ไขเพื่อดึงเฉพาะไฟล์ล่าสุดตามสถานะปัจจุบัน
    for (const doc of rfaDocs) {
      // ดึงไฟล์ล่าสุดที่ตรงกับสถานะปัจจุบันของเอกสาร
      const files = await Database.query(`
        SELECT file_name, file_url, google_file_id
        FROM rfa_document_files
        WHERE rfa_document_id = ? AND document_status = ?
        ORDER BY id DESC
        LIMIT 1
      `, [doc.id, doc.status]);
      
      // ถ้าไม่มีไฟล์ที่ตรงกับสถานะปัจจุบัน ให้ดึงไฟล์ล่าสุดแทน
      if (files.length === 0) {
        const latestFiles = await Database.query(`
          SELECT file_name, file_url, google_file_id
          FROM rfa_document_files
          WHERE rfa_document_id = ?
          ORDER BY id DESC
          LIMIT 1
        `, [doc.id]);
        
        documents.push({
          ...doc,
          files: latestFiles
        });
      } else {
        documents.push({
          ...doc,
          files: files
        });
      }
    }
    
    return documents;
  }

  /**
   * ตรวจสอบเอกสารซ้ำ
   * @param {number} siteId - ID ของไซต์
   * @param {string} fullDocumentNumber - เลขที่เอกสารเต็ม
   * @returns {Promise<Array>} - รายการเอกสารที่พบ
   */
  static async checkExistingDocument(siteId, fullDocumentNumber) {
    return Database.query(`
      SELECT * FROM rfa_documents
      WHERE site_id = ? AND full_document_number = ?
    `, [siteId, fullDocumentNumber]);
  }

  static async updateDocumentFields(documentId, updateFields) {
    return Database.transaction(async (connection) => {
      // สร้าง SQL query จาก updateFields
      const keys = Object.keys(updateFields);
      const values = Object.values(updateFields);
      
      if (keys.length === 0) return true;
      
      const setClauses = keys.map((key, index) => `${key} = ?`).join(', ');
      const query = `UPDATE rfa_documents SET ${setClauses} WHERE id = ?`;
      
      await connection.query(query, [...values, documentId]);
      return true;
    });
  }  
}

module.exports = RfaModel;