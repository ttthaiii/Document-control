const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();  
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();
const cors = require('cors');
const { handleDisconnect, testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler'); // เพิ่มบรรทัดนี้
const FileService = require('./services/fileService');

// กำหนดค่า JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// 1. เช็ค DATABASE_URL ก่อน setup app
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) { 
  console.error('Database configuration is incomplete in .env file');
  console.log('Setting DATABASE_URL as fallback...');
  // สร้าง DATABASE_URL จากค่าที่ต้องการ
  process.env.DATABASE_URL = `mysql://${process.env.DB_USER || 'dbadmin'}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'bimcollaboration.mysql.database.azure.com'}:${process.env.DB_PORT || '3306'}/${process.env.DB_DATABASE || 'railway'}`;
}

// 2. Setup middleware
const corsOptions = {
  origin: function(origin, callback) {
    // สนับสนุนทั้ง HTTP และ HTTPS
    const allowedOrigins = [
      'https://bimcollaboration-dxfjfsb7axcgcwbx.southeastasia-01.azurewebsites.net',
      'http://bimcollaboration-dxfjfsb7axcgcwbx.southeastasia-01.azurewebsites.net',
      'http://localhost:3001',
      'http://localhost:3000'
    ];
    
    // null origin คือการเรียกใช้งานจาก Postman หรือ backend เอง
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// กำหนดค่า JWT_SECRET ให้กับแอปพลิเคชัน
app.set('jwt-secret', JWT_SECRET);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.originalUrl}`);
  if (req.method === 'POST') {
    console.log('Request body keys:', Object.keys(req.body));
    if (req.file) {
      console.log('Uploaded file:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }
  }
  next();
});

// 3. Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.use(errorHandler);

// SPA fallback route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Not found: ${req.method} ${req.url}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 4. Port configuration
const PORT = process.env.PORT || 3000;  

// 5. Database connection และ Start server
const startServer = async () => {
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    const connected = await testConnection();
    
    if (connected) {
      handleDisconnect();
      
      // สร้างไดเร็กทอรีชั่วคราวสำหรับอัปโหลดไฟล์
      await FileService.ensureUploadDirectory();
      
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } else {
      console.error('Initial database connection failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();