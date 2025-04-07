// ttsdoc-project/backend/models/database.js
const { pool } = require('../config/database');

/**
 * คลาสสำหรับจัดการการเชื่อมต่อกับฐานข้อมูล
 */
class Database {
  /**
   * ดำเนินการ SQL query และจัดการ connection
   * @param {string} sql - คำสั่ง SQL ที่ต้องการรัน
   * @param {Array} params - พารามิเตอร์สำหรับคำสั่ง SQL
   * @returns {Promise<Array>} - ผลลัพธ์จากการ query
   */
  static async query(sql, params = []) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [results] = await connection.query(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * ดำเนินการ transaction
   * @param {Function} callback - ฟังก์ชันที่จะดำเนินการใน transaction
   * @returns {Promise<any>} - ผลลัพธ์จาก callback
   */
  static async transaction(callback) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Transaction error:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * ตรวจสอบว่ามีคอลัมน์ในตารางหรือไม่
   * @param {string} table - ชื่อตาราง
   * @param {string} column - ชื่อคอลัมน์
   * @returns {Promise<boolean>} - true ถ้ามีคอลัมน์
   */
  static async hasColumn(table, column) {
    const results = await this.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    return results.length > 0;
  }
}

module.exports = Database;