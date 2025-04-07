// PermissionManagement.js
import React from 'react';

// นิยามสถานะและสิทธิการเข้าถึงต่างๆ
export const DOCUMENT_STATUSES = {
  BIM_SENT: 'BIM ส่งแบบ',
  SEND_TO_CM: 'ส่ง CM',
  EDIT: 'แก้ไข',
  APPROVED: 'อนุมัติ',
  APPROVED_WITH_COMMENT_NO_EDIT: 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
  APPROVED_WITH_COMMENT_EDIT: 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
  REJECTED: 'ไม่อนุมัติ'
};

// สถานะที่แต่ละตำแหน่งสามารถแก้ไขได้
export const EDITABLE_STATUSES = {
  'BIM': [
    DOCUMENT_STATUSES.EDIT,
    DOCUMENT_STATUSES.REJECTED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_EDIT
  ],
  'Adminsite': [
    DOCUMENT_STATUSES.BIM_SENT,
    DOCUMENT_STATUSES.SEND_TO_CM

  ],
  'Adminsite2': [
    DOCUMENT_STATUSES.BIM_SENT

  ],
  'CM': [
    DOCUMENT_STATUSES.SEND_TO_CM
  ]
};

// สถานะที่แต่ละตำแหน่งสามารถเลือกได้เมื่อทำการอัพเดท - แบบทั่วไป
export const ALLOWED_UPDATE_STATUSES = {
  'Adminsite': [
    DOCUMENT_STATUSES.SEND_TO_CM, 
    DOCUMENT_STATUSES.EDIT,
    DOCUMENT_STATUSES.APPROVED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_NO_EDIT,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_EDIT,
    DOCUMENT_STATUSES.REJECTED
  ],
  'Adminsite2': [
    DOCUMENT_STATUSES.SEND_TO_CM,
    DOCUMENT_STATUSES.EDIT
  ],
  'CM': [
    DOCUMENT_STATUSES.APPROVED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_NO_EDIT,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_EDIT,
    DOCUMENT_STATUSES.REJECTED
  ]
};

// สถานะที่ Adminsite สามารถเลือกได้ตามสถานะปัจจุบันของเอกสาร
export const ADMINSITE_STATUS_OPTIONS = {
  [DOCUMENT_STATUSES.BIM_SENT]: [
    DOCUMENT_STATUSES.SEND_TO_CM,
    DOCUMENT_STATUSES.EDIT
  ],
  [DOCUMENT_STATUSES.SEND_TO_CM]: [
    DOCUMENT_STATUSES.APPROVED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_NO_EDIT,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_EDIT,
    DOCUMENT_STATUSES.REJECTED
  ]
};

// ฟังก์ชันตรวจสอบว่าผู้ใช้สามารถสร้างเอกสารใหม่ได้หรือไม่
export const canCreateNewDocument = (jobPosition) => {
  return jobPosition === 'BIM';
};

// ฟังก์ชันตรวจสอบว่าผู้ใช้สามารถแก้ไขเอกสารที่มีสถานะนี้ได้หรือไม่
export const canEditDocument = (jobPosition, documentStatus) => {
  if (!jobPosition || !documentStatus) return false;
  return EDITABLE_STATUSES[jobPosition]?.includes(documentStatus) || false;
};

// ฟังก์ชันดึงสถานะที่ผู้ใช้สามารถเลือกได้
export const getAllowedStatusOptions = (jobPosition, currentStatus) => {
  // กรณีพิเศษสำหรับ Adminsite ที่ขึ้นกับสถานะปัจจุบันของเอกสาร
  if (jobPosition === 'Adminsite' && currentStatus) {
    if (currentStatus === DOCUMENT_STATUSES.BIM_SENT || 
        currentStatus === DOCUMENT_STATUSES.SEND_TO_CM) {
      return ADMINSITE_STATUS_OPTIONS[currentStatus] || [];
    }
  }
  
  // กรณีทั่วไป ตาม jobPosition
  return ALLOWED_UPDATE_STATUSES[jobPosition] || [];
};

// ฟังก์ชันกำหนดผู้รับผิดชอบตามสถานะเอกสาร
export const getResponsibleParty = (document) => {
  const status = document.status;
  
  if (status === DOCUMENT_STATUSES.BIM_SENT) {
    return 'SITE';
  } else if (status === DOCUMENT_STATUSES.SEND_TO_CM) {
    return 'CM';
  } else if ([
    DOCUMENT_STATUSES.EDIT,
    DOCUMENT_STATUSES.REJECTED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_EDIT
  ].includes(status)) {
    return 'BIM';
  } else if ([
    DOCUMENT_STATUSES.APPROVED,
    DOCUMENT_STATUSES.APPROVED_WITH_COMMENT_NO_EDIT
  ].includes(status)) {
    return 'อนุมัติ';
  }
  
  return 'SITE'; // Default
};

// คอมโพเนนต์สำหรับฟอร์มอัพเดทสถานะ

export const DocumentStatusUpdateForm = ({ 
  currentDocument, 
  user, 
  onSubmit, 
  onClose,
  isSubmitting,
  successMessage // เพิ่มพารามิเตอร์ successMessage
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [documentFile, setDocumentFile] = React.useState([]);
    
    // ตรวจสอบว่าสามารถแก้ไขเอกสารนี้ได้หรือไม่
    const isEditable = canEditDocument(user?.jobPosition, currentDocument?.status);
    
    // ดึงรายการสถานะที่สามารถเลือกได้ - ใช้สถานะปัจจุบันของเอกสารด้วย
    const allowedStatuses = getAllowedStatusOptions(user?.jobPosition, currentDocument?.status);
    
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      setDocumentFile(prev => [...prev, ...files]);
      
      // รีเซ็ตค่า input file เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
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

          {/* แสดงข้อความกำลังโหลด 
          {isSubmitting && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>กำลังอัพเดตสถานะ...</p>
            </div>
          )} */}         

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

          {/* เพิ่มส่วนนี้เพื่อแสดงข้อความสำเร็จ */}
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
                    successMessage !== ''} // เพิ่มเงื่อนไขนี้
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
    successMessage // เพิ่มพารามิเตอร์ successMessage
  }) => {
    const [documentFile, setDocumentFile] = React.useState([]);
    
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      setDocumentFile(prev => [...prev, ...files]);
      
      // รีเซ็ตค่า input file เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
      e.target.value = '';
    };
  
    // เพิ่มฟังก์ชันลบไฟล์
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

          {/* แสดงข้อความกำลังโหลด 
          {isSubmitting && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>กำลังอัพเดตสถานะ...</p>
            </div>
          )}  */}        
          
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

          {/* เพิ่มส่วนนี้เพื่อแสดงข้อความสำเร็จ */}
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
                  disabled={isSubmitting || documentFile.length === 0 || successMessage !== ''} // เพิ่มเงื่อนไขนี้
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



