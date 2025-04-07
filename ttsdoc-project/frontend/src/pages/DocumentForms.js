import React, { useState } from 'react';

// คอมโพเนนต์สำหรับฟอร์มส่งเอกสารใหม่
export const NewDocumentForm = ({ 
  selectedSite, 
  categories, 
  formData, 
  setFormData, 
  handleFormChange, 
  handleFileChange, 
  handleNewDocumentSubmit, 
  loading, 
  onClose 
}) => {
  // เพิ่ม state สำหรับเก็บรายชื่อไฟล์
  const [selectedFiles, setSelectedFiles] = useState([]);

  // ฟังก์ชันใหม่สำหรับการจัดการไฟล์
  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    
    // เพิ่มไฟล์ใหม่เข้าไปใน state โดยไม่ลบไฟล์เดิม
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // อัปเดตข้อมูลไฟล์ใน formData
    if (formData.file) {
      // ถ้ามีไฟล์อยู่แล้ว ให้รวมกับไฟล์ใหม่
      const updatedFiles = Array.isArray(formData.file) 
        ? [...formData.file, ...newFiles]
        : [formData.file, ...newFiles];
      
      setFormData(prev => ({
        ...prev,
        file: updatedFiles
      }));
    } else {
      // ถ้ายังไม่มีไฟล์
      setFormData(prev => ({
        ...prev,
        file: newFiles.length === 1 ? newFiles[0] : newFiles
      }));
    }
    
    // รีเซ็ตค่า input file เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = '';
  };

  // ฟังก์ชันสำหรับลบไฟล์
  const handleRemoveFile = (index) => {
    // สร้าง array ใหม่โดยตัดไฟล์ที่ต้องการลบออก
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
    
    // อัปเดต formData
    if (updatedFiles.length === 0) {
      // ถ้าไม่มีไฟล์เหลือเลย
      setFormData(prev => ({
        ...prev,
        file: null
      }));
    } else if (updatedFiles.length === 1) {
      // ถ้าเหลือไฟล์เดียว
      setFormData(prev => ({
        ...prev,
        file: updatedFiles[0]
      }));
    } else {
      // ถ้ายังมีหลายไฟล์
      setFormData(prev => ({
        ...prev,
        file: updatedFiles
      }));
    }
  };

  return (
    <div className="new-document-form">      
      <form onSubmit={handleNewDocumentSubmit} className="document-form">
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
              value={formData.revision_number}
              onChange={handleFormChange}
              placeholder="เช่น 0"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="title">ชื่อเอกสาร:</label>
            <input 
              type="text" 
              id="title" 
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="ชื่อเอกสาร"
              required
            />
          </div>
        </div>
        
        <div className="form-group file-upload-group">
          <label htmlFor="file">แนบไฟล์ (เลือกได้หลายไฟล์):</label>
          <input 
            id="documents"
            type="file" 
            name="documents"
            multiple 
            onChange={handleFiles} 
            disabled={loading}
          />
          
          {/* ส่วนแสดงไฟล์ที่เลือก */}
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <p className="files-heading">ไฟล์ที่เลือก:</p>
              <ul className="file-list">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="file-item">
                    {file.name}
                    <button 
                      type="button" 
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(index)}
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
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? 'กำลังประมวลผล...' : 'ส่งเอกสาร'}
          </button>
        </div>
      </form>
    </div>
  );
};

// คอมโพเนนต์สำหรับฟอร์มอัพเดทเอกสาร
export const UpdateDocumentForm = ({ 
  selectedDocument, 
  handleFileChange, 
  handleSubmit, 
  loading, 
  formData,
  onClose 
}) => {
  // เพิ่ม state สำหรับเก็บรายชื่อไฟล์
  const [selectedFiles, setSelectedFiles] = useState([]);

  // ฟังก์ชันใหม่สำหรับการจัดการไฟล์
  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    
    // เพิ่มไฟล์ใหม่เข้าไปใน state โดยไม่ลบไฟล์เดิม
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // อัปเดตข้อมูลไฟล์ใน formData
    if (formData.file) {
      // ถ้ามีไฟล์อยู่แล้ว ให้รวมกับไฟล์ใหม่
      const updatedFiles = Array.isArray(formData.file) 
        ? [...formData.file, ...newFiles]
        : [formData.file, ...newFiles];
      
      // เรียกฟังก์ชันเดิมด้วยไฟล์ที่อัปเดต
      const updatedEvent = {
        target: {
          files: updatedFiles
        }
      };
      
      handleFileChange(updatedEvent);
    } else {
      // ถ้ายังไม่มีไฟล์ ให้เรียกฟังก์ชันเดิม
      handleFileChange(e);
    }
    
    // รีเซ็ตค่า input file เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = '';
  };

  // ฟังก์ชันสำหรับลบไฟล์
  const handleRemoveFile = (index) => {
    // สร้าง array ใหม่โดยตัดไฟล์ที่ต้องการลบออก
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
    
    // สร้าง event จำลองเพื่อส่งไปให้ handleFileChange
    const updatedEvent = {
      target: {
        files: updatedFiles.length > 0 ? updatedFiles : null
      }
    };
    
    // เรียกฟังก์ชัน handleFileChange เพื่ออัปเดต formData
    handleFileChange(updatedEvent);
  };

  return (
    <div className="document-detail-container">
      <div className="document-detail-header">
        รายละเอียดเอกสาร
        {onClose && (
          <button 
            type="button"
            className="close-button"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        )}
      </div>
      <div className="document-info">
        <p><strong>ข้อมูลเอกสาร:</strong> {selectedDocument.full_document_number || 'N/A'}_{selectedDocument.title}</p>
        <p><strong>เลขที่เอกสาร:</strong> {selectedDocument.full_document_number}</p>
        <p><strong>Rev.No:</strong> {selectedDocument.revision_number}</p>
        <p><strong>ชื่อเอกสาร:</strong> {selectedDocument.title}</p>
        <p><strong>สถานะเอกสาร:</strong> {selectedDocument.status}</p>
        <p>
          <strong>ไฟล์แนบ:</strong> 
          <a href={selectedDocument.file_url} target="_blank" rel="noopener noreferrer" className="view-file-link">ดูไฟล์</a>
        </p>
      </div>

      <div className="update-section">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="file">แนบไฟล์ (เลือกได้หลายไฟล์):</label>
            <input 
                id="documents"
                type="file" 
                name="documents"
                multiple 
                onChange={handleFiles} 
                disabled={loading}
            />
            
            {/* ส่วนแสดงไฟล์ที่เลือก */}
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <p className="files-heading">ไฟล์ที่เลือก:</p>
                <ul className="file-list">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="file-item">
                      {file.name}
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(index)}
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
              disabled={loading || selectedFiles.length === 0}
            >
              {loading ? 'กำลังประมวลผล...' : 'Update เอกสาร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};