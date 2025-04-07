// ttsdoc-project/backend/models/userModel.js
const Database = require('./database');

class UserModel {
   /** 
    * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงไซต์หรือไม่
    * @param {number} userId - ID ของผู้ใช้
    * @param {number} siteId - ID ของไซต์
    * @returns {Promise<Array>} - ข้อมูลความสัมพันธ์ระหว่างผู้ใช้และไซต์
    */
   static async getUserSitesById(userId, siteId) {
     return Database.query(`
       SELECT * FROM user_sites 
       WHERE user_id = ? AND site_id = ?
     `, [userId, siteId]);
   }  
  /**
   * ดึงข้อมูลผู้ใช้ตาม ID
   * @param {number} userId - ID ของผู้ใช้
   * @returns {Promise<Object|null>} - ข้อมูลผู้ใช้
   */
  static async getUserById(userId) {
    const users = await Database.query('SELECT * FROM users WHERE id = ?', [userId]);
    return users.length ? users[0] : null;
  }

  /**
   * ดึงโครงการของผู้ใช้
   * @param {number} userId - ID ของผู้ใช้
   * @returns {Promise<Array>} - รายการโครงการ
   */
  static async getUserSites(userId) {
    return Database.query(`
      SELECT DISTINCT s.id, s.site_name 
      FROM sites s
      INNER JOIN user_sites us ON s.id = us.site_id
      WHERE us.user_id = ?
      ORDER BY s.site_name ASC
    `, [userId]);
  }

  /**
   * ตรวจสอบการเข้าสู่ระบบ
   * @param {string} username - ชื่อผู้ใช้
   * @param {string} password - รหัสผ่าน
   * @returns {Promise<Object|null>} - ข้อมูลผู้ใช้
   */
  static async authenticate(username, password) {
    const users = await Database.query(`
      SELECT id, username, role, job_position, email 
      FROM users 
      WHERE username = ? AND password = ? AND active = true
    `, [username, password]);
    
    return users.length ? users[0] : null;
  }
}

module.exports = UserModel;