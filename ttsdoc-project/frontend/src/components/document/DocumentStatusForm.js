import React, { useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { canEditDocument, getAllowedStatusOptions } from '../../utils/documentUtils';

const DocumentStatusForm = ({ 
  document, 
  user, 
  onSubmit, 
  onClose,
  loading,
  successMessage
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const { files, handleFileChange, handleRemoveFile } = useFileUpload();
  
  // ตรวจสอบว่าสามารถแก้ไขเอกสารนี้ได้หรือไม่
  const isEditable = canEditDocument(user?.jobPosition, document?.status);
  
  // ดึงรายการสถานะที่สามารถเลือกได้
  const allowedStatuses = getAllowedStatusOptions(user?.jobPosition, document?.status);
  
  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && isEditable) {
      onSubmit({
        documentId: document.id,
        status: selectedStatus,
        file: files.length > 0 ? files : null
      });
    }
  };
  
  return (
    <div className="document-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{`${document.full_document_number || `${document.category_code}-${document.document_number}`}_${document.revision_number}_${document.title}`}</h2>
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

        {successMessage && (
          <div className="success-message modal-success">
            {successMessage}
          </div>
        )}          
        
        <div className="document-info">
          <p><strong>เลขที่เอกสาร:</strong> {document.full_document_number || `${document.category_code}-${document.document_number}`}</p>
          <p><strong>Rev.No:</strong> {document.revision_number}</p>
          <p><strong>ชื่อเอกสาร:</strong> {document.title}</p>
          <p><strong>สถานะเอกสาร:</strong> {document.status}</p>
          
          <div>
            <strong>ไฟล์แนบ:</strong>
            <div className="file-list">
              {document.files && document.files.map((file, idx) => (
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
              {!document.files && document.file_url && 
                <div className="file-link-container">
                  <span className="file-bullet">•</span>
                  <a 
                    href={document.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-file-link"
                  >
                    {document.file_name || document.title || "ดูไฟล์"}
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
                  disabled={loading || !!successMessage}
                />

                {/* แสดงไฟล์ที่เลือก */}
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
                            aria-label="ลบไฟล์"
                            disabled={loading || !!successMessage}
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
                    disabled={loading || !!successMessage}
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
                  disabled={
                    loading || 
                    (user?.jobPosition !== 'BIM' && !selectedStatus) || 
                    files.length === 0 ||
                    !!successMessage
                  } 
                >
                  {loading ? 'กำลังประมวลผล...' : 
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

export default DocumentStatusForm;