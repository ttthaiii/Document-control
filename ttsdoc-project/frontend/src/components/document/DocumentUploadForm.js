import React, { useEffect } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

const DocumentUploadForm = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  loading, 
  onClose,
  categories = []
}) => {
  const { files, handleFileChange, handleRemoveFile } = useFileUpload();

  // อัปเดต formData เมื่อ files เปลี่ยนแปลง
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      file: files.length > 0 ? (files.length === 1 ? files[0] : files) : null
    }));
  }, [files, setFormData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={onSubmit} className="document-form">
      <div className="form-row">
        <div className="form-group" style={{width: '100%'}}>
          <label htmlFor="full_document_number">เลขที่เอกสาร:</label>
          <input 
            type="text"
            id="full_document_number"
            name="full_document_number"
            placeholder="เช่น ST-001"
            value={formData.full_document_number || ''}
            onChange={handleFormChange}
            required
            disabled={loading}
          />
          <small className="form-helper-text">กรุณาระบุรหัสหมวดงาน-เลขที่เอกสาร (เช่น ST-001)</small>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="revision_number">Rev.No:</label>
          <input 
            type="text" 
            id="revision_number" 
            name="revision_number"
            value={formData.revision_number || ''}
            onChange={handleFormChange}
            placeholder="เช่น 0"
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="title">ชื่อเอกสาร:</label>
          <input 
            type="text" 
            id="title" 
            name="title"
            value={formData.title || ''}
            onChange={handleFormChange}
            placeholder="ชื่อเอกสาร"
            required
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="form-group file-upload-group">
        <label htmlFor="file">แนบไฟล์ (เลือกได้หลายไฟล์):</label>
        <input 
          id="file"
          type="file" 
          name="file"
          multiple 
          onChange={handleFileChange} 
          disabled={loading}
        />
        
        {/* ส่วนแสดงไฟล์ที่เลือก */}
        {files.length > 0 && (
          <div className="selected-files">
            <p className="files-heading">ไฟล์ที่เลือก:</p>
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={index} className="file-item">
                  {file.name}
                  <button 
                    type="button" 
                    className="remove-file-btn"
                    onClick={() => handleRemoveFile(index)}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button 
          type="submit"
          className="submit-button"
          disabled={
            loading || 
            !formData.full_document_number || 
            !formData.revision_number || 
            !formData.title || 
            !(formData.file)
          }
        >
          {loading ? 'กำลังประมวลผล...' : 'ส่งเอกสาร'}
        </button>
      </div>
    </form>
  );
};

export default DocumentUploadForm;