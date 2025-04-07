// src/components/shared/DocumentForm.js
import React, { useState, useEffect } from 'react';
import { useDocumentContext } from '../../contexts/DocumentContext';
import api from '../../services/api';

const DocumentForm = ({ onClose, isAdmin = false }) => {
  const { selectedDocument, setSelectedDocument, showSuccess, showError, setLoading } = useDocumentContext();
  const [formData, setFormData] = useState({
    status: '',
    files: []
  });
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    // ล้างค่าฟอร์มเมื่อเปลี่ยนเอกสารที่เลือก
    setFormData({
      status: '',
      files: []
    });
    setSuccessMessage('');
  }, [selectedDocument]);

  const handleStatusChange = (e) => {
    setFormData({ ...formData, status: e.target.value });
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFormData({ ...formData, files: [...formData.files, ...newFiles] });
    e.target.value = ''; // รีเซ็ตค่า input file
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = [...formData.files];
    updatedFiles.splice(index, 1);
    setFormData({ ...formData, files: updatedFiles });
  };

  // สถานะที่อนุญาตตามตำแหน่งงาน
  const getAllowedStatuses = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const jobPosition = user.jobPosition || '';

    if (isAdmin) {
      // สถานะสำหรับ admin
      switch (jobPosition) {
        case 'Adminsite':
          return ['ส่ง CM', 'แก้ไข', 'อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ'];
        case 'Adminsite2':
          return ['ส่ง CM', 'แก้ไข'];
        case 'CM':
          return ['อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ'];
        default:
          return [];
      }
    } else {
      // สถานะสำหรับ user ทั่วไป (เช่น BIM)
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.files.length === 0) {
      showError('กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์');
      return;
    }

    try {
      setLoading(true);
      const submitData = new FormData();
      
      if (isAdmin) {
        // กรณีใช้ในหน้า Admin
        submitData.append('documentId', selectedDocument.id);
        submitData.append('selectedStatus', formData.status);
        
        formData.files.forEach(file => {
          submitData.append('documents', file);
        });
        
        const response = await api.post('/api/user/rfa/update-status', submitData);
        
        if (response.data.success) {
          setSuccessMessage('อัพเดทสถานะสำเร็จ');
          showSuccess('อัพเดทสถานะสำเร็จ');
          // รีเฟรชข้อมูลหลังอัพเดท (ใช้ callback จาก parent)
          if (onClose) {
            setTimeout(() => {
              onClose('success');
            }, 2000);
          }
        }
      } else {
        // กรณีใช้ในหน้า Dashboard (สำหรับ BIM)
        submitData.append('documentId', selectedDocument.id);
        
        formData.files.forEach(file => {
          submitData.append('documents', file);
        });
        
        const response = await api.post('/api/user/rfa/update', submitData);
        
        if (response.data.success) {
          setSuccessMessage('อัพเดทเอกสารสำเร็จ');
          showSuccess('อัพเดทเอกสารสำเร็จ');
          
          if (onClose) {
            setTimeout(() => {
              onClose('success');
            }, 2000);
          }
        }
      }
    } catch (error) {
      showError(error.response?.data?.error || 'เกิดข้อผิดพลาดในการอัพเดทเอกสาร');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDocument) return null;

  return (
    <div className="document-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{`${selectedDocument.full_document_number || `${selectedDocument.category_code}-${selectedDocument.document_number}`}_${selectedDocument.revision_number}_${selectedDocument.title}`}</h2>
          {onClose && (
            <button 
              type="button"
              className="close-button"
              onClick={() => onClose()}
              disabled={false}
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
          <p><strong>เลขที่เอกสาร:</strong> {selectedDocument.full_document_number || `${selectedDocument.category_code}-${selectedDocument.document_number}`}</p>
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
                disabled={!!successMessage}
              />

              {/* แสดงไฟล์ที่เลือก */}
              {formData.files.length > 0 && (
                <div className="selected-files">
                  <p className="files-heading">ไฟล์ที่เลือก:</p>
                  <ul className="file-list">
                    {formData.files.map((file, index) => (
                      <li key={index} className="file-item">
                        {file.name}
                        <button 
                          type="button" 
                          className="remove-file-btn"
                          onClick={() => handleRemoveFile(index)}
                          disabled={!!successMessage}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isAdmin && getAllowedStatuses().length > 0 && (
              <div className="form-group">
                <label>สถานะเอกสาร:</label>
                <select 
                  value={formData.status}
                  onChange={handleStatusChange}
                  required={isAdmin}
                  disabled={!!successMessage}
                >
                  <option value="">เลือกสถานะ</option>
                  {getAllowedStatuses().map(status => (
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
                  !!successMessage || 
                  formData.files.length === 0 || 
                  (isAdmin && !formData.status)
                }
              >
                {isAdmin ? 'Submit' : 'อัพเดทเอกสาร'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentForm;