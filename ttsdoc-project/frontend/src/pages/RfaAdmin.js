// src/pages/RfaAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DocumentProvider } from '../contexts/DocumentContext';
import { useDocumentContext } from '../contexts/DocumentContext';
import DocumentTable from '../components/shared/DocumentTable';
import DocumentForm from '../components/shared/DocumentForm';
import api from '../services/api';
import './RfaAdmin.css';

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
  const loadDocuments = async () => {
    try {
      console.log('Loading documents...');
      setLoading(true);
      
      const response = await api.get('/api/user/rfa/documents');
      
      if (response.data.success) {
        setDocuments(response.data.documents);
        setFilteredDocuments(response.data.documents);
      } else {
        showError(response.data.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
      setLoading(false);
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
    
    if (result === 'success') {
      loadDocuments();
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
      <DocumentTable 
        onRowClick={showDocumentDetails} 
        isAdmin={true} 
      />
      
      {/* แสดงฟอร์มรายละเอียดเอกสาร */}
      {selectedDocument && (
        <DocumentForm 
          onClose={handleFormClose}
          isAdmin={true}
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