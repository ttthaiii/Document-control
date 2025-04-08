import React, { useEffect } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import DocumentViewer from './DocumentViewer';

const DocumentUpdateForm = ({ 
  document, 
  onSubmit, 
  onClose,
  loading,
  successMessage
}) => {
  const { files, handleFileChange, handleRemoveFile } = useFileUpload();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    onSubmit({
      documentId: document.id,
      file: files,
      status: 'BIM ส่งแบบ' // สถานะ default สำหรับ BIM
    });
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
        
        <div className="update-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>แนบไฟล์:</label>
              <input 
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
            <div className="form-actions">
              <button 
                type="submit"
                className="submit-button"
                disabled={loading || files.length === 0 || !!successMessage}
              >
                {loading ? 'กำลังประมวลผล...' : 'Update เอกสาร'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpdateForm;