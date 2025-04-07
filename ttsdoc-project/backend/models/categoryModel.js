// ttsdoc-project/backend/models/categoryModel.js
const Database = require('./database');

class CategoryModel {
  /**
   * ดึงหมวดหมู่ตามไซต์
   * @param {number} siteId - ID ของไซต์
   * @returns {Promise<Array>} - รายการหมวดหมู่
   */
  static async getCategoriesBySite(siteId) {
    return Database.query(`
      SELECT id, category_name, category_code
      FROM work_categories 
      WHERE site_id = ?
    `, [siteId]);
  }

  /**
   * ค้นหา category ID ตาม code และ site ID
   * @param {string} categoryCode - รหัสหมวดหมู่
   * @param {number} siteId - ID ของไซต์
   * @returns {Promise<number|null>} - ID ของหมวดหมู่ หรือ null
   */
  static async getCategoryId(categoryCode, siteId) {
    // เพิ่ม logging เพื่อตรวจสอบค่าที่ส่งมา
    console.log('Searching for category:', { categoryCode, siteId });

    // ตรวจสอบว่าค่าที่ส่งมาถูกต้อง
    if (!categoryCode || !siteId) {
      console.error('Missing required parameters');
      return null;
    }

    const categories = await Database.query(
      'SELECT id FROM work_categories WHERE category_code = ? AND site_id = ? AND active = true LIMIT 1',
      [categoryCode, siteId]
    );

    // เพิ่ม logging ผลลัพธ์
    console.log('Query result:', categories);

    if (!categories || categories.length === 0) {
      console.log('No category found');
      return null;
    }

    return categories[0].id;
  }

  /**
   * สร้างหมวดหมู่ใหม่
   * @param {number} siteId - ID ของไซต์
   * @param {string} categoryName - ชื่อหมวดหมู่
   * @param {string} categoryCode - รหัสหมวดหมู่
   * @param {string} description - คำอธิบาย
   * @returns {Promise<number>} - ID ของหมวดหมู่ที่สร้างขึ้น
   */
  static async createCategory(siteId, categoryName, categoryCode, description = null) {
    return Database.transaction(async (connection) => {
      const [result] = await connection.query(
        'INSERT INTO work_categories (category_code, category_name, site_id, description) VALUES (?, ?, ?, ?)',
        [categoryCode, categoryName, siteId, description]
      );
      
      return result.insertId;
    });
  }
}

module.exports = CategoryModel;