// src/pages/RfaAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DocumentProvider } from '../contexts/DocumentContext';
import { useDocumentContext } from '../contexts/DocumentContext';
import api from '../services/api';
import './RfaAdmin.css';

// นำเข้าคอมโพเนนต์ใหม่
import DocumentViewer from '../components/document/DocumentViewer';
import DocumentUpdateForm from '../components/document/DocumentUpdateForm';
import DocumentStatusForm from '../components/document/DocumentStatusForm';
import { canEditDocument } from '../utils/documentUtils';

// ฟังก์ชัน debounce สำหรับการค้นหา
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// คอมโพเนนต์หลัก
const RfaAdminContent = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { 
    documents, 
    setDocuments, 
    filteredDocuments, 
    setFilteredDocuments,
    selectedDocument, 
    setSelectedDocument,
    loading,
    setLoading,
    error,
    showError,
    success
  } = useDocumentContext();

  // โหลดข้อมูลเมื่อ component mount
  useEffect(() => {
    if (user && user.jobPosition) {
      loadDocuments();
    }
  }, [user]);

  // ตรวจสอบว่าถูกเรียกจาก Dashboard หรือไม่
  useEffect(() => {
    const fromDashboard = location.state?.fromDashboard || false;
    const preSelectedDocument = location.state?.document || null;
    
    if (fromDashboard && preSelectedDocument) {
      setSelectedDocument(preSelectedDocument);
    }
  }, [location]);

  // กรองเอกสารเมื่อมีการค้นหา
  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm]);

  // กรองเอกสารตามคำค้นหา
  const filterDocuments = () => {
    if (!searchTerm) {
      setFilteredDocuments(documents);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = documents.filter(doc => {
      const searchString = `${doc.category_code || ''}-${doc.document_number || ''} ${doc.title || ''}`.toLowerCase();
      return searchString.includes(term);
    });

    setFilteredDocuments(filtered);
  };

  // โหลดเอกสารทั้งหมด
  const loadDocuments = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // เพิ่ม timestamp เพื่อป้องกันการแคชข้อมูล
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      const response = await api.get(`/api/user/rfa/documents/${selectedSite}${timestamp}`);
      
      if (response.data.success) {
        setDocuments(response.data.documents);
        setFilteredDocuments(response.data.documents);
      } else {
        showError(response.data.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร');
    } finally {
      setLoading(false);
      setIsInitialLoad(false); // ตั้งค่านี้เป็น false เพื่อให้ spinner หายไป
    }
  };

  // ค้นหาเอกสาร
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    try {
      const response = await api.get(`/api/user/rfa/search?searchTerm=${encodeURIComponent(value)}`);
      
      if (response.data.success) {
        setDocuments(response.data.documents);
        setFilteredDocuments(response.data.documents);
      } else {
        showError(response.data.error || 'เกิดข้อผิดพลาดในการค้นหา');
      }
    } catch (error) {
      console.error('Error searching documents:', error);
      showError('เกิดข้อผิดพลาดในการค้นหา');
    }
  };

  // แสดงรายละเอียดเอกสาร
  const showDocumentDetails = (doc) => {
    setSelectedDocument(doc);
  };

  // แสดง Modal สถานะ
  const showStatusModal = (status) => {
    setModalStatus(status);
    setIsModalOpen(true);
  };

  // ใช้ debounce กับฟังก์ชันค้นหา
  const debouncedSearch = React.useCallback(
    debounce((e) => handleSearch(e), 500),
    []
  );

  // ฟังก์ชันเพื่อกลับไปที่ Dashboard
  const handleBackToDashboard = () => {
    navigate('/rfa-dashboard');
  };

  // ฟังก์ชันที่เรียกเมื่อฟอร์มถูกปิด
  const handleFormClose = (result) => {
    setSelectedDocument(null);
    setSuccessMessage('');
    
    if (result === 'success') {
      loadDocuments(true);
    }
  };

  // ฟังก์ชันสำหรับจัดการการส่งฟอร์มอัพเดทสถานะ
  const handleStatusUpdateSubmit = async (formData) => {
    setLoading(true);
    setIsSubmitting(true);
    console.log('Sending update request with data:', formData);
    
    const submitData = new FormData();
    submitData.append('documentId', formData.documentId);
    submitData.append('selectedStatus', formData.status);
    
    // ตรวจสอบว่า file เป็น array หรือไม่
    if (formData.file && formData.file.length > 0) {
      // ถ้าเป็น array ให้ loop เพิ่มทีละไฟล์
      formData.file.forEach((file) => {
        submitData.append('documents', file);
      });
    }

    try {
      const response = await api.post('/api/user/rfa/update-status', submitData);
      console.log('Update response:', response.data);
  
      if (response.data.success) {
        // โหลดเอกสารใหม่พร้อมบังคับให้ไม่ใช้ cache
        console.log('Reloading documents with force refresh...');
        await loadDocuments(true);
        
        // แสดงข้อความสำเร็จในฟอร์ม
        setSuccessMessage('อัพเดทสถานะสำเร็จ');
        
        // ปิด loading หลังจาก 2 วินาที
        setTimeout(() => {
          setIsSubmitting(false);
          setSelectedDocument(null);
          setSuccessMessage('');
        }, 2000);
      } else {
        setIsSubmitting(false);
        showError(response.data.error || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setIsSubmitting(false);
      showError('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  return (
    <div className="container">
      {/* เพิ่มปุ่มกลับไปที่ Dashboard */}
      <div className="back-to-dashboard">
        <button onClick={handleBackToDashboard} className="back-button">
          &larr; กลับไปที่ Dashboard
        </button>
      </div>

      <h1>Update Status Shop Drawing</h1>
      
      {/* ส่วนค้นหา */}
      <div className="search-section">
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            debouncedSearch(e);
          }}
          placeholder="ค้นหาเอกสาร (หมวดงาน-เลขที่เอกสาร หรือ ชื่อเอกสาร)" 
          className="search-input"
        />
      </div>

      {/* แสดงข้อความ Error หรือ Success */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* แสดงตาราง */}
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>No</th>
              <th>หมายเลขเอกสาร</th>
              <th>รายชื่อเอกสาร</th>
              <th>สถานะ</th>
              <th>ไฟล์แนบ</th>
              <th>วันที่</th>
              <th>ผู้ส่ง</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc, index) => {
              const documentId = doc.full_document_number || `${doc.category_code}-${doc.document_number}_${doc.revision_number}`;
              
              return (
                <tr 
                  key={doc.id}
                  className={selectedDocument && selectedDocument.id === doc.id ? 'selected-row' : ''}
                  onClick={() => showDocumentDetails(doc)}
                >
                  <td>{index + 1}</td>
                  <td>{documentId}</td>
                  <td>{doc.title}</td>
                  <td>{doc.status}</td>
                  <td>
                    {doc.files && doc.files.map((file, idx) => (
                      <div key={idx} className="file-link-container">
                        <span className="file-bullet">•</span>
                        <a 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="view-file-link"
                        >
                          {file.file_name || `ไฟล์ ${idx+1}`}
                        </a>
                      </div>
                    ))}
                    {!doc.files && doc.file_url && 
                      <div className="file-link-container">
                        <span className="file-bullet">•</span>
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="view-file-link"
                        >
                          {doc.file_name || doc.title || "ดูไฟล์"}
                        </a>
                      </div>
                    }
                  </td>
                  <td>{doc.updated_at || doc.created_at}</td>
                  <td>{doc.updated_by_name || doc.created_by_name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* แสดงฟอร์มรายละเอียดเอกสาร - ใช้คอมโพเนนต์ใหม่ */}
      {selectedDocument && canEditDocument(user?.jobPosition, selectedDocument?.status) && (
        <DocumentStatusForm
          document={selectedDocument}
          user={user}
          onSubmit={handleStatusUpdateSubmit}
          onClose={handleFormClose}
          loading={isSubmitting}
          successMessage={successMessage}
        />
      )}

      {/* Modal แสดงสถานะ */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-content">
              <h3>เอกสารฉบับนี้ อยู่ระหว่างการอนุมัติ</h3>
              <p>Status: {modalStatus}</p>
              <p>ไม่สามารถส่งซ้ำได้</p>
              <button onClick={() => setIsModalOpen(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      )}
    </div>
  );
};

// Wrapper component ที่ใช้ Provider
const RfaAdmin = ({ user }) => {
  return (
    <DocumentProvider>
      <RfaAdminContent user={user} />
    </DocumentProvider>
  );
};

export default RfaAdmin;