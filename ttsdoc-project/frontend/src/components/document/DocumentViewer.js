import React from 'react';

const DocumentViewer = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div className="document-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{document.full_document_number || `${document.category_code}-${document.document_number}`}_{document.revision_number}_{document.title}</h2>
          {onClose && (
            <button 
              type="button"
              className="close-button"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        
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
      </div>
    </div>
  );
};

export default DocumentViewer;