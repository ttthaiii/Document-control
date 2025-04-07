// ttsdoc-project/backend/config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// กำหนดค่าการเชื่อมต่อฐานข้อมูล
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // เพิ่มการเชื่อมต่อ SSL
  ssl: {
    // ข้ามการตรวจสอบใบรับรอง (ใช้ในการพัฒนา ไม่แนะนำสำหรับการใช้งานจริง)
    rejectUnauthorized: false
  }
};

// สร้าง connection pool
const pool = mysql.createPool(dbConfig);

// ฟังก์ชันทดสอบการเชื่อมต่อฐานข้อมูล
const testConnection = async () => {
  try {
    console.log('Database connection parameters:');
    console.log('Host:', dbConfig.host);
    console.log('User:', dbConfig.user);
    console.log('Database:', dbConfig.database);
    console.log('Port:', dbConfig.port);
    console.log('SSL enabled:', !!dbConfig.ssl);

    const connection = await pool.getConnection();
    console.log('Database connection successful');
    
    // ทดสอบการ query ข้อมูล
    const [rows] = await connection.query('SELECT 1 as result');
    console.log('Query test successful');
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// ฟังก์ชันจัดการการเชื่อมต่อฐานข้อมูลที่หลุด
const handleDisconnect = () => {
  pool.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Database connection lost. Reconnecting...');
      // สามารถเพิ่มโค้ดการเชื่อมต่อใหม่ที่นี่ถ้าต้องการ
    } else {
      throw err;
    }
  });
};

module.exports = {
  pool,
  testConnection,
  handleDisconnect
};