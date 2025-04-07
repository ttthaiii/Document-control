// ttsdoc-project/backend/config/googleDrive.js
const { google } = require('googleapis');
const fs = require('fs');
const fsSync = require('fs');
const path = require('path');

// โหลด credentials จากไฟล์
let credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));

// ✅ แปลง \n ให้เป็น newline จริงใน private_key
if (credentials.private_key.includes('\n')) {
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
}

// ✅ ฟังก์ชันสร้าง Google Drive client
const createDriveClient = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
  });
  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client });
};

// ✅ ฟังก์ชันทดสอบการเชื่อมต่อ
const testDriveConnection = async () => {
  try {
    console.log('Testing Google Drive connection...');
    const drive = await createDriveClient();
    const result = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
      supportsAllDrives: true
    });
    console.log('Drive connection test successful:', result.data.files.length > 0);
    return true;
  } catch (error) {
    console.error('Drive connection test failed:', error.message);
    return false;
  }
};

// ✅ ฟังก์ชันหลักสำหรับบริการ Google Drive
const driveService = {
  uploadToDrive: async (userId, filePath, fileName, mimetype) => {
    try {
      console.log('Starting file upload to Google Drive:', { userId, fileName });

      if (!fsSync.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      const drive = await createDriveClient();
      const fileMetadata = {
        name: fileName,
        parents: [credentials.folder_id || 'YOUR_DEFAULT_FOLDER_ID']
      };

      const media = {
        mimeType: mimetype,
        body: fsSync.createReadStream(filePath)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
      });

      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        console.log('File permission set to public');
      } catch (permError) {
        console.warn('Permission setting failed:', permError.message);
      }

      console.log('File uploaded successfully. ID:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Upload to Google Drive failed:', error.message);
      throw error;
    }
  },

  verifyAccess: async () => {
    try {
      const drive = await createDriveClient();
      await drive.files.list({ pageSize: 1, supportsAllDrives: true });
      console.log('Drive access verified');
      return true;
    } catch (error) {
      console.error('Drive access verification failed:', error);
      return false;
    }
  },

  testConnection: async () => {
    return testDriveConnection();
  },

  initialize: async () => {
    try {
      const hasAccess = await driveService.verifyAccess();
      if (!hasAccess) {
        console.warn('Failed to verify Google Drive access, but continuing...');
      } else {
        console.log('Google Drive service initialized successfully');
      }
      return true;
    } catch (error) {
      console.error('Service initialization failed:', error);
      return false;
    }
  },

  deleteFile: async (fileId) => {
    try {
      const drive = await createDriveClient();
      await drive.files.delete({ fileId: fileId, supportsAllDrives: true });
      return true;
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }
};

// ✅ เรียกทดสอบการเชื่อมต่อ

// เรียกเมื่อโหลดไฟล์นี้
(async () => {
  await driveService.initialize();
  const success = await driveService.testConnection();
  console.log('Google Drive connection test:', success ? 'PASSED' : 'FAILED');
})();

module.exports = driveService;