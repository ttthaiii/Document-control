// DocumentForm.js - รวมฟอร์มการจัดการเอกสารเข้าด้วยกัน
import React, { useState } from 'react';
import { DOCUMENT_STATUSES, canEditDocument, getAllowedStatusOptions } from '../../constants';

// คอมโพเนนต์สำหรับฟอร์มอัพเดทสถานะทั่วไป
export const DocumentStatusUpdateForm = ({ 
  currentDocument, 
  user, 
  onSubmit, 
  onClose,
  isSubmitting,
  successMessage 
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [documentFile, setDocumentFile] = useState([]);
    
  // ตรวจสอบว่าสามารถแก้ไขเอกสารนี้ได้หรือไม่
  const isEditable = canEditDocument(user?.jobPosition, currentDocument?.status);
    
  // ดึงรายการสถานะที่สามารถเลือกได้ - ใช้สถานะปัจจุบันของเอกสารด้วย
  const allowedStatuses = getAllowedStatusOptions(user?.jobPosition, currentDocument?.status);
    
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocumentFile(prev => [...prev, ...files]);
    e.target.value = '';
  };

  // เพิ่มฟังก์ชันลบไฟล์
  const handleRemoveFile = (index) => {
    const updatedFiles = [...documentFile];
    updatedFiles.splice(index, 1);
    setDocumentFile(updatedFiles);
  };
    
  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
  };
    
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && isEditable) {
      onSubmit({
        documentId: currentDocument.id,
        status: selectedStatus,
        file: documentFile.length > 0 ? documentFile : null
      });
    }
  };
    
  return (
    <div className="document-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{`${currentDocument.full_document_number}_${currentDocument.revision_number}_${currentDocument.title}`}</h2>
          {onClose && (
            <button 
              type="button"
              className="close-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ✕
            </button>
          )}
        </div>

        {successMessage && (
          <div className="success-message modal-success">
            {successMessage}
          </div>
        )}          
        
        <div className="document-info">
          <p><strong>เลขที่เอกสาร:</strong> {currentDocument.full_document_number}</p>
          <p><strong>Rev.No:</strong> {currentDocument.revision_number}</p>
          <p><strong>ชื่อเอกสาร:</strong> {currentDocument.title}</p>
          <p><strong>สถานะเอกสาร:</strong> {currentDocument.status}</p>
          
          <div>
            <strong>ไฟล์แนบ:</strong>
            <div className="file-list">
              {currentDocument.files && currentDocument.files.map((file, idx) => (
                <div key={idx} className="file-link-container">
                  <span className="file-bullet">•</span>
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-file-link"
                  >
                    {file.file_name || `ไฟล์ ${idx+1}`}
                  </a>
                </div>
              ))}
              {!currentDocument.files && currentDocument.file_url && 
                <div className="file-link-container">
                  <span className="file-bullet">•</span>
                  <a 
                    href={currentDocument.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-file-link"
                  >
                    {currentDocument.file_name || currentDocument.title || "ดูไฟล์"}
                  </a>
                </div>
              }
            </div>
          </div>
        </div>
        
        {/* แสดงฟอร์มอัพเดทสถานะเฉพาะเมื่อสามารถแก้ไขได้ */}
        {isEditable && (
          <div className="update-section">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="file-upload">แนบไฟล์:</label>
                <input 
                  id="file-upload"
                  type="file" 
                  multiple
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />

                {/* แสดงไฟล์ที่เลือก */}
                {documentFile.length > 0 && (
                  <div className="selected-files">
                    <p className="files-heading">ไฟล์ที่เลือก:</p>
                    <ul className="file-list">
                      {documentFile.map((file, index) => (
                        <li key={index} className="file-item">
                          {file.name}
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={() => handleRemoveFile(index)}
                            aria-label="ลบไฟล์"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* แสดงการเลือกสถานะเมื่อไม่ใช่ BIM หรือมี allowedStatuses */}
              {user?.jobPosition !== 'BIM' && allowedStatuses.length > 0 && (
                <div className="form-group">
                  <label htmlFor="status-select">สถานะเอกสาร:</label>
                  <select 
                    id="status-select"
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">เลือกสถานะ</option>
                    {allowedStatuses.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-actions">
              <button 
                type="submit"
                className="submit-button"
                disabled={isSubmitting || 
                  (user?.jobPosition !== 'BIM' && !selectedStatus) || 
                  documentFile.length === 0 ||
                  successMessage !== ''} 
              >
                {isSubmitting ? 'กำลังประมวลผล...' : 
                  user?.jobPosition === 'BIM' ? 'Update เอกสาร' : 'Submit'}
              </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// คอมโพเนนต์การจัดการเอกสาร BIM
export const BimDocumentUpdateForm = ({
  selectedDocument,
  onSubmit,
  onClose,
  isSubmitting,
  successMessage
}) => {
  const [documentFile, setDocumentFile] = useState([]);
  
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocumentFile(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = [...documentFile];
    updatedFiles.splice(index, 1);
    setDocumentFile(updatedFiles);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (documentFile.length === 0) return;
    
    if (onSubmit) {
      onSubmit({
        documentId: selectedDocument.id,
        file: documentFile,
        status: DOCUMENT_STATUSES.BIM_SENT
      });
    }
  };
  
  return (
    <div className="document-details-modal">
      <div className="modal-content">       
        <div className="modal-header">
          <h2>{`${selectedDocument.full_document_number}_${selectedDocument.revision_number}_${selectedDocument.title}`}</h2>
          {onClose && (
            <button 
              type="button"
              className="close-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ✕
            </button>
          )}
        </div>

        {successMessage && (
          <div className="success-message modal-success">
            {successMessage}
          </div>
        )}         
        
        <div className="document-info">
          <p><strong>เลขที่เอกสาร:</strong> {selectedDocument.full_document_number}</p>
          <p><strong>Rev.No:</strong> {selectedDocument.revision_number}</p>
          <p><strong>ชื่อเอกสาร:</strong> {selectedDocument.title}</p>
          <p><strong>สถานะเอกสาร:</strong> {selectedDocument.status}</p>
          
          <div>
            <strong>ไฟล์แนบ:</strong>
            <div className="file-list">
              {selectedDocument.files && selectedDocument.files.map((file, idx) => (
                <div key={idx} className="file-link-container">
                  <span className="file-bullet">•</span>
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-file-link"
                  >
                    {file.file_name || `ไฟล์ ${idx+1}`}
                  </a>
                </div>
              ))}
              {!selectedDocument.files && selectedDocument.file_url && 
                <div className="file-link-container">
                  <span className="file-bullet">•</span>
                  <a 
                    href={selectedDocument.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-file-link"
                  >
                    {selectedDocument.file_name || selectedDocument.title || "ดูไฟล์"}
                  </a>
                </div>
              }
            </div>
          </div>
        </div>
        
        <div className="update-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>แนบไฟล์:</label>
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                disabled={isSubmitting}
              />

              {/* แสดงไฟล์ที่เลือก */}
              {documentFile.length > 0 && (
                <div className="selected-files">
                  <p className="files-heading">ไฟล์ที่เลือก:</p>
                  <ul className="file-list">
                    {documentFile.map((file, index) => (
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
                disabled={isSubmitting || documentFile.length === 0 || successMessage !== ''}
              >
                {isSubmitting ? 'กำลังประมวลผล...' : 'Update เอกสาร'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// คอมโพเนนต์สำหรับฟอร์มสร้างเอกสารใหม่
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
  // เพิ่มฟังก์ชันลบไฟล์
  const handleRemoveFile = (index) => {
    if (!formData.file || !Array.isArray(formData.file)) return;
    
    const updatedFiles = [...formData.file];
    updatedFiles.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      file: updatedFiles.length > 0 ? updatedFiles : null
    }));
  };
  
  return (
    <form onSubmit={handleNewDocumentSubmit}>
      <div className="form-group">
        <label htmlFor="full_document_number">เลขที่เอกสาร:</label>
        <input
          id="full_document_number"
          type="text"
          name="full_document_number"
          value={formData.full_document_number}
          onChange={handleFormChange}
          placeholder="เช่น AR-001 หรือ ST-101"
          required
          disabled={loading}
        />
        <small>รูปแบบ: รหัสหมวดงาน-เลขที่เอกสาร (เช่น AR-001)</small>
      </div>
      
      <div className="form-group">
        <label htmlFor="revision_number">Rev.No:</label>
        <input
          id="revision_number"
          type="text"
          name="revision_number"
          value={formData.revision_number}
          onChange={handleFormChange}
          placeholder="เช่น 00, 01, 02"
          required
          disabled={loading}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="title">ชื่อเอกสาร:</label>
        <input
          id="title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleFormChange}
          placeholder="ชื่อเอกสาร"
          required
          disabled={loading}
        />
      </div>
      
      <div className="form-group">
        <label>แนบไฟล์:</label>
        <input 
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={loading}
          required
        />
        
        {/* แสดงไฟล์ที่เลือก */}
        {formData.file && (
          <div className="selected-files">
            <p className="files-heading">ไฟล์ที่เลือก:</p>
            <ul className="file-list">
              {Array.isArray(formData.file) ? (
                formData.file.map((file, index) => (
                  <li key={index} className="file-item">
                    {file.name}
                    <button 
                      type="button" 
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(index)}
                      aria-label="ลบไฟล์"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </li>
                ))
              ) : (
                <li className="file-item">
                  {formData.file.name}
                  <button 
                    type="button" 
                    className="remove-file-btn"
                    onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                    aria-label="ลบไฟล์"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading || !formData.full_document_number || !formData.revision_number || !formData.title || !formData.file}
        >
          {loading ? 'กำลังอัปโหลด...' : 'อัปโหลดเอกสาร'}
        </button>
        <button 
          type="button" 
          className="cancel-btn"
          onClick={onClose}
          disabled={loading}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
};

// คอมโพเนนต์แสดงผลสำเร็จ
export const SuccessModal = ({ message, onClose }) => {
  return (
    <div className="success-modal-backdrop">
      <div className="success-modal">
        <div className="success-modal-content">
          <div className="success-icon">✓</div>
          <h3>{message}</h3>
          <button 
            className="close-success-btn"
            onClick={onClose}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};