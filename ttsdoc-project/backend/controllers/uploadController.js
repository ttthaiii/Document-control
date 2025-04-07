// ttsdoc-project/backend/controllers/uploadController.js
const FileService = require('../services/fileService');

// อัปโหลดไฟล์
const uploadFile = async (req, res) => {
  try {
    console.log('Files:', req.files);
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    
    const userId = req.user.id;
    const documentFiles = req.files.documents || [];
    
    // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    if (documentFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'No document files provided' });
    }
    
    // อัปโหลดไฟล์ทั้งหมด
    const uploadResults = await Promise.all(
      documentFiles.map(file => FileService.uploadFile(userId, file))
    );
    
    return res.json({
      success: true,
      message: 'Files uploaded successfully',
      documents: uploadResults
    });
    
  } catch (error) {
    console.error('Error uploading files:', error);
    
    // ทำความสะอาดไฟล์ที่อาจจะค้างอยู่
    if (req.files && req.files.documents) {
      await FileService.cleanupFailedUploads(
        req.files.documents.map(file => file.path)
      );
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload files'
    });
  }
};

module.exports = {
  uploadFile
};