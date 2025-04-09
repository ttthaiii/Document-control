import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { DocumentProvider } from '../contexts/DocumentContext';
import { useDocumentContext } from '../contexts/DocumentContext';
import { 
  getResponsibleParty, 
  calculatePendingDays, 
  canCreateNewDocument 
} from '../utils/documentUtils';
import api from '../services/api';

// นำเข้าคอมโพเนนต์ใหม่
import DocumentViewer from '../components/document/DocumentViewer';
import DocumentUploadForm from '../components/document/DocumentUploadForm';
import DocumentUpdateForm from '../components/document/DocumentUpdateForm';
import DocumentStatusForm from '../components/document/DocumentStatusForm';

// รีจิสเตอร์ ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

// คอมโพเนนต์ SuccessModal (ยังคงไว้เพราะใช้ในหลายที่)
const SuccessModal = ({ message, onClose }) => {
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

const RfaDashboardContent = ({ user }) => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [showLatestRevOnly, setShowLatestRevOnly] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewDocumentForm, setShowNewDocumentForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    file: null,
    full_document_number: '',
    revision_number: '',
    title: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [updateDocumentSuccess, setUpdateDocumentSuccess] = useState('');
  const [newDocumentSuccess, setNewDocumentSuccess] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ใช้ context สำหรับการจัดการข้อมูลเอกสาร
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
    setError, // ตรวจสอบว่ามีการดึง setError มาด้วย
    success,
    setSuccess,
    showError,
    showSuccess
  } = useDocumentContext();

  // โหลดรายการโครงการเมื่อ component mount
  useEffect(() => {
    if (user && user.jobPosition) {
      loadSites();
    }
  }, [user]);

  // โหลดเอกสารเมื่อเลือกโครงการ
  useEffect(() => {
    if (selectedSite) {
      loadDocuments();
    }
  }, [selectedSite]);

  // กรองเอกสารตามการค้นหาและการเลือกแสดงเฉพาะ rev ล่าสุด
  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, showLatestRevOnly, statusFilter]);

  // ตั้งค่า default statusFilter ตามตำแหน่งงาน
  useEffect(() => {
    if (user && user.jobPosition && statusFilter === '') {
      if (user.jobPosition === 'BIM') {
        setStatusFilter('BIM');
      } else if (user.jobPosition === 'Adminsite' || user.jobPosition === 'Adminsite2') {
        setStatusFilter('SITE');
      } else if (user.jobPosition === 'CM') {
        setStatusFilter('CM');
      } else {
        setStatusFilter('all'); // fallback
      }
    }
  }, [user]);   

  // สร้างข้อมูลสำหรับแผนภูมิโดนัท
  useEffect(() => {
    prepareChartData();
  }, [documents, selectedSite, statusFilter]);  
    
  // โหลดหมวดหมู่เมื่อเลือกโครงการ
  useEffect(() => {
    if (selectedSite) {
      loadCategories();
    }
  }, [selectedSite]);

  // เมื่อเลือกโครงการหรือตำแหน่งงานครั้งแรก
  useEffect(() => {
    // เมื่อคอมโพเนนต์โหลดครั้งแรก
    return () => {
      // ทำความสะอาดเมื่อคอมโพเนนต์ถูกทำลาย
      setIsInitialLoad(false);
    };
  }, []);

  // ตั้งค่าค่าเริ่มต้น
  useEffect(() => {
    if (selectedSite) {
      setIsInitialLoad(true); // รีเซ็ตเป็น true ทุกครั้งที่เปลี่ยนโครงการ
      loadDocuments();
    }
  }, [selectedSite]);  

  // โหลดรายการโครงการ
  const loadSites = async () => {
    try {
      setLoading(true);
      setError(''); // ตรงนี้ต้องมี setError แล้ว
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
  
      const response = await fetch('/api/user/rfa/user-sites', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      const data = await response.json();
      if (data.success) {
        setSites(data.sites);
        if (data.sites.length > 0) {
          setSelectedSite(data.sites[0].id);
        }
      } else {
        // เปลี่ยนจาก setError เป็น showError หรือให้แน่ใจว่ามี setError จริง
        showError('ไม่สามารถโหลดข้อมูลโครงการได้');
        // หรือ
        // setError('ไม่สามารถโหลดข้อมูลโครงการได้');
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      // เปลี่ยนจาก setError เป็น showError หรือให้แน่ใจว่ามี setError จริง
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูลโครงการ');
      // หรือ
      // setError('เกิดข้อผิดพลาดในการโหลดข้อมูลโครงการ');
    } finally {
      setLoading(false);
    }
  };

  // โหลดเอกสาร
  const loadDocuments = async (forceReload = false) => {
    try {
      setLoading(true);
      setError('');
  
      // เพิ่มการป้องกัน cache โดยใช้ timestamp
      const timestamp = forceReload ? `?t=${Date.now()}` : '';
      const response = await api.get(`/api/user/rfa/documents/${selectedSite}${timestamp}`);
      
      console.log("📦 Loaded documents for site:", selectedSite, response.data.documents.length);
  
      if (response.data.success) {
        setDocuments(response.data.documents);
      } else {
        showError(response.data.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร');
    } finally {
      setIsInitialLoad(false);
      setLoading(false);
    }
  };

  // โหลดหมวดหมู่
  const loadCategories = async () => {
    if (!selectedSite) return;
    
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`/api/user/rfa/categories/${selectedSite}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      } else {
        setError(data.error || 'ไม่สามารถโหลดข้อมูลหมวดหมู่ได้');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่');
    } finally {
      setLoading(false);
    }
  };

  // แก้ไขฟังก์ชัน filterDocuments
  const filterDocuments = () => {
    if (loading) return;

    let filtered = [...documents];
    
    // กรองตามคำค้นหา
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        const docId = doc.full_document_number 
          ? `${doc.full_document_number}_${doc.revision_number || ''}`.toLowerCase()
          : `${doc.category_code || ''}-${doc.document_number || ''}_${doc.revision_number || ''}`.toLowerCase();
        const docTitle = (doc.title || '').toLowerCase();
        return docId.includes(term) || docTitle.includes(term);
      });
    }

    console.log("ก่อนกรอง Latest Rev:", filtered.length);
    
    // แสดงเฉพาะ revision ล่าสุด - ย้ายส่วนนี้มาทำก่อนการกรองตามสถานะ
    if (showLatestRevOnly) {
      const latestRevisions = new Map();
      
      filtered.forEach(doc => {
        // ใช้ full_document_number ถ้ามี หรือสร้างจาก category_code และ document_number
        const docNum = doc.full_document_number || 
                    (doc.category_code && doc.document_number ? 
                    `${doc.category_code}-${doc.document_number}` : 
                    doc.id.toString());
        
        const currentRev = parseInt(doc.revision_number) || 0;
        const existingRev = latestRevisions.has(docNum) ? 
                            (parseInt(latestRevisions.get(docNum).revision_number) || 0) : 
                            -1;
        
        if (!latestRevisions.has(docNum) || currentRev > existingRev) {
          latestRevisions.set(docNum, doc);
        }
      });
      
      filtered = Array.from(latestRevisions.values());
      console.log("หลังกรอง Latest Rev:", filtered.length);
    }

    // กรองตามสถานะ - ย้ายมาเป็นขั้นตอนสุดท้าย
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => {
        if (statusFilter === 'BIM') {
          return getResponsibleParty(doc) === 'BIM';
        } else if (statusFilter === 'SITE') {
          return getResponsibleParty(doc) === 'SITE';
        } else if (statusFilter === 'CM') {
          return getResponsibleParty(doc) === 'CM';
        } else if (statusFilter === 'อนุมัติ') {
          return getResponsibleParty(doc) === 'อนุมัติ';
        }
        return true;
      });
    }

    setFilteredDocuments(filtered);
  };

  // เตรียมข้อมูลสำหรับแผนภูมิโดนัท
  const prepareChartData = () => {
    // ถ้าไม่มีเอกสารเลย ให้ตั้ง chartData เป็น null หรือมีค่า totalCount = 0
    if (documents.length === 0) {
      setChartData({
        labels: ['BIM', 'SITE', 'CM', 'อนุมัติ'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#FFD700', '#FF6384', '#36A2EB', '#4BC0C0'],
          borderWidth: 0,
        }],
        totalCount: 0
      });
      return;
    }
    
    // สร้างชุดข้อมูลเอกสารที่ต้องการแสดงในแผนภูมิ (เฉพาะเวอร์ชันล่าสุด)
    const latestRevsMap = new Map();
    
    // หา revision ล่าสุดของแต่ละเอกสาร
    documents.forEach(doc => {
      const key = `${doc.full_document_number}_${doc.site_id}`;
      if (!latestRevsMap.has(key) || 
          parseInt(doc.revision_number) > parseInt(latestRevsMap.get(key).revision_number)) {
        latestRevsMap.set(key, doc);
      }
    });
    
    // ใช้เฉพาะเวอร์ชันล่าสุดสำหรับแผนภูมิ
    const chartDocsData = Array.from(latestRevsMap.values());
    
    // จัดกลุ่มเอกสารตามผู้รับผิดชอบ (BIM, SITE, CM, อนุมัติ)
    const bimCount = chartDocsData.filter(doc => getResponsibleParty(doc) === 'BIM').length;
    const siteCount = chartDocsData.filter(doc => getResponsibleParty(doc) === 'SITE').length;
    const cmCount = chartDocsData.filter(doc => getResponsibleParty(doc) === 'CM').length;
    const approvedCount = chartDocsData.filter(doc => getResponsibleParty(doc) === 'อนุมัติ').length;
    
    // คำนวณจำนวนรวม
    const totalCount = bimCount + siteCount + cmCount + approvedCount;
  
    // สร้างสีตามสถานะการกรอง
    const defaultColors = ['#FFD700', '#FF6384', '#36A2EB', '#4BC0C0']; // BIM, SITE, CM, อนุมัติ
    
    let backgroundColor = [...defaultColors];
    
    // ถ้ามีการกรองข้อมูล ให้ปรับสีของแผนภูมิ
    if (statusFilter !== 'all') {
      backgroundColor = defaultColors.map((color, index) => {
        if ((statusFilter === 'BIM' && index === 0) ||
            (statusFilter === 'SITE' && index === 1) ||
            (statusFilter === 'CM' && index === 2) ||
            (statusFilter === 'อนุมัติ' && index === 3)) {
          return color; // ใช้สีปกติสำหรับสถานะที่เลือก
        } else {
          // ใช้สีเดิมแต่จางลง 
          return color + '15'; // เพิ่ม alpha channel 50%
        }
      });
    }
  
    setChartData({
      labels: ['BIM', 'SITE', 'CM', 'อนุมัติ'],
      datasets: [
        {
          data: [bimCount, siteCount, cmCount, approvedCount],
          backgroundColor: backgroundColor,
          borderColor: backgroundColor.map(color => color.length > 7 ? color.substring(0, 7) : color), // ตัด alpha ออกเพื่อให้ border เข้ม
          borderWidth: 0,
        },
      ],
      // เพิ่มข้อมูลรวมสำหรับแสดงตรงกลาง
      totalCount: totalCount
    });
  };

  // การจัดการเมื่อคลิกที่แผนภูมิโดนัท
  const handleChartClick = (_, elements) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      const clickedLabel = chartData.labels[dataIndex];
      
      // ถ้าคลิกที่ส่วนที่กำลังถูกกรองอยู่แล้ว ให้ยกเลิกการกรอง
      if ((statusFilter === 'BIM' && clickedLabel === 'BIM') ||
          (statusFilter === 'SITE' && clickedLabel === 'SITE') ||
          (statusFilter === 'CM' && clickedLabel === 'CM') ||
          (statusFilter === 'อนุมัติ' && clickedLabel === 'อนุมัติ')) {
        setStatusFilter('all');
      } else {
        // กรองตามประเภทที่คลิก
        setStatusFilter(clickedLabel);
      }
    }
  };

  // แสดงรายละเอียดเอกสาร
  const showDocumentDetails = (document) => {
    setSelectedDocument(document);
  };

  // ปิดฟอร์มรายละเอียดเอกสาร
  const handleFormClose = (result) => {
    setSelectedDocument(null);
    setUpdateDocumentSuccess('');
    
    if (result === 'success') {
      // เรียกใช้ loadDocuments พร้อมบังคับให้ไม่ใช้ cache
      loadDocuments(true);
    }
  };

  // เปิดฟอร์มส่งเอกสารใหม่
  const handleNewDocumentClick = () => {
    setShowNewDocumentForm(true);
    setSelectedDocument(null);
  };

  // ปิดฟอร์มส่งเอกสารใหม่
  const handleNewDocumentClose = () => {
    setShowNewDocumentForm(false);
    setNewDocumentSuccess('');
  };

  // การจัดการเมื่อเลือกโครงการ
  const handleSiteChange = (e) => {
    setSelectedSite(e.target.value);
    setDocuments([]);
    setFilteredDocuments([]);
    setError('');
    setSuccess('');
    setSelectedDocument(null);
    setNewDocumentSuccess('');
    setUpdateDocumentSuccess('');
    setChartData(null); // เพิ่มบรรทัดนี้เพื่อรีเซ็ต chartData เมื่อเปลี่ยน site
  };

  // ฟังก์ชันตรวจสอบว่ามีเอกสารซ้ำหรือไม่
  const checkExistingDocument = async () => {
    if (!formData.full_document_number) return false;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/user/rfa/check-document?siteId=${selectedSite}&fullDocumentNumber=${formData.full_document_number}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const data = await response.json();
      if (data.exists) {
        setError('เอกสารนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking document:', error);
      setError('เกิดข้อผิดพลาดในการตรวจสอบเอกสาร');
      return true;
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันส่งเอกสารใหม่
  const handleNewDocumentSubmit = async (e) => {
    e.preventDefault();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!formData.full_document_number || !formData.title || !formData.revision_number || !formData.file) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    // ตรวจสอบเอกสารซ้ำ
    const exists = await checkExistingDocument();
    if (exists) return;
    
    try {
      setLoading(true);
      setError('');
      
      const formDataObj = new FormData();
      formDataObj.append('siteId', selectedSite);
      formDataObj.append('fullDocumentNumber', formData.full_document_number);
      formDataObj.append('revisionNumber', formData.revision_number);
      formDataObj.append('title', formData.title);
      
      // ส่วนของไฟล์
      if (formData.file) {
        if (Array.isArray(formData.file)) {
          formData.file.forEach(f => formDataObj.append('documents', f));
        } else {
          formDataObj.append('documents', formData.file);
        }
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/rfa/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataObj
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // โหลดข้อมูลเอกสารใหม่
        loadDocuments();
        
        // รีเซ็ตข้อมูลฟอร์ม
        setFormData({
          file: null,
          full_document_number: '',
          revision_number: '',
          title: ''
        });
        
        // ปิด loading
        setLoading(false);
        
        // แสดงข้อความสำเร็จในฟอร์ม
        setNewDocumentSuccess('อัปโหลดเอกสารสำเร็จ');
        
        // แสดง success modal หลังจาก 2 วินาที
        setTimeout(() => {
          setShowNewDocumentForm(false);
          setNewDocumentSuccess('');
          setSuccessMessage('อัปโหลดเอกสารสำเร็จ');
          setShowSuccessModal(true);
        }, 2000);
      } else {
        setLoading(false);
        setError(result.error || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setLoading(false);
      setError('เกิดข้อผิดพลาด: ' + error.message);
    }
  };
  
  // ฟังก์ชัน Export ข้อมูลเป็น CSV
  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      // สร้างข้อมูลสำหรับ CSV
      const csvRows = [];
      
      // หัวตาราง
      const headers = [
        'หมายเลขเอกสาร',
        'รายชื่อเอกสาร',
        'วันที่ส่ง shop',
        'วันที่ส่งอนุมัติ',
        'วันที่รับผลอนุมัติ',
        'ผลการอนุมัติ',
        'ค้างดำเนินการ (วัน)',
        'ผู้รับผิดชอบ'
      ];
      csvRows.push(headers.join(','));
      
      // ข้อมูลเอกสาร
      filteredDocuments.forEach(doc => {
        const row = [
          `${doc.category_code}-${doc.document_number}_${doc.revision_number}`,
          `"${doc.title.replace(/"/g, '""')}"`, // ใส่ "" และหลีกเลี่ยง double quote
          doc.created_at || '',
          doc.send_approval_date || '',
          doc.approval_date || '',
          doc.status,
          calculatePendingDays(doc),
          getResponsibleParty(doc)
        ];
        csvRows.push(row.join(','));
      });
      
      // สร้างและดาวน์โหลดไฟล์ CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `shop_drawing_dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      setError('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setIsExporting(false);
    }
  };

  // ฟังก์ชันสำหรับจัดการการส่งฟอร์มอัพเดทสถานะ
  const handleStatusUpdateSubmit = (formData) => {
    if (user?.jobPosition === 'BIM') {
      handleBimUpdate(formData);
    } else {
      handleAdminUpdate(formData);
    }
  };

  // ฟอร์มอัพเดทสถานะใน Admin/CM
  const handleAdminUpdate = async (formData) => {
    setLoading(true);
    
    const submitData = new FormData();
    submitData.append('documentId', formData.documentId);
    submitData.append('selectedStatus', formData.status);
    
    // ตรวจสอบว่า file เป็น array หรือไม่
    if (formData.file && formData.file.length > 0) {
      // ถ้าเป็น array ให้ loop เพิ่มทีละไฟล์
      formData.file.forEach((file, index) => {
        submitData.append('documents', file);
      });
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/rfa/update-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData
      });
  
      const data = await response.json();
  
      if (data.success) {
        // โหลดเอกสารใหม่พร้อมบังคับให้ไม่ใช้ cache
        loadDocuments(true);
        
        // แสดงข้อความสำเร็จในฟอร์ม
        setUpdateDocumentSuccess('อัพเดทสถานะสำเร็จ');
        
        // ปิด loading หลังจาก 2 วินาที
        setTimeout(() => {
          setSelectedDocument(null);
          setUpdateDocumentSuccess('');
          setSuccessMessage('อัพเดทสถานะสำเร็จ');
          setShowSuccessModal(true);
        }, 2000);
      } else {
        setLoading(false);
        setError(data.error || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setLoading(false);
      setError('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  // ฟอร์มอัพเดทสำหรับ BIM
  const handleBimUpdate = async (formData) => {
    try {
      setLoading(true);
      setError('');
      
      const submitData = new FormData();
      submitData.append('documentId', formData.documentId);
      submitData.append('status', 'BIM ส่งแบบ'); // สถานะ default
      
      // ตรวจสอบว่า file เป็น array หรือไม่
      if (formData.file && formData.file.length > 0) {
        // ถ้าเป็น array ให้ loop เพิ่มทีละไฟล์
        formData.file.forEach((file, index) => {
          submitData.append('documents', file);
        });
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/rfa/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData
      });

      const result = await response.json();
      if (result.success) {
        let message = 'อัพเดทเอกสารสำเร็จ';
        
        // การแสดงข้อความถ้ามีการสร้างเอกสารใหม่
        if (result.data?.newRevisionNumber) {
          if (result.data.newDocumentId && result.data.newDocumentId !== result.data.originalDocumentId) {
            message += ` สร้างเอกสารใหม่ Rev.No: ${result.data.newRevisionNumber}`;
          }
          else {
            message += ` Rev.No: ${result.data.newRevisionNumber}`;
          }
        }
        
        // โหลดเอกสารใหม่
        loadDocuments(true);
                
        // ปิด loading
        setLoading(false);
        
        // แสดง success modal หลังจาก 2 วินาที
        setTimeout(() => {
          setSelectedDocument(null);
          setUpdateDocumentSuccess('');
          setSuccessMessage(message);
          setShowSuccessModal(true);
        }, 2000);
      } else {
        setLoading(false);
        setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setLoading(false);
      setError('เกิดข้อผิดพลาดในการส่งเอกสาร');
    }
  };

// คำนวณขนาดแผนภูมิที่เหมาะสม
const chartOptions = {
  responsive: true,
  cutout: '65%', // ทำให้โดนัทมีรูตรงกลางใหญ่ขึ้น
  plugins: {
    legend: {
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.raw || 0;
          // แสดงแค่ตัวเลขไม่มีเปอร์เซ็นต์
          return `${label}: ${value}`;
        }
      }
    }
  },
  onClick: handleChartClick
};

// คอมโพเนนต์สำหรับแสดงข้อมูลตรงกลางโดนัท
const DonutCenterText = ({ data, statusFilter }) => {
// คำนวณจำนวนรวมตามสถานะที่เลือก
let totalToShow = 0;

if (statusFilter === 'all') {
  // กรณีเลือกทุกสถานะ แสดงผลรวมทั้งหมด
  totalToShow = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
} else {
  // กรณีเลือกเฉพาะสถานะใดสถานะหนึ่ง แสดงเฉพาะจำนวนของสถานะนั้น
  const index = data.labels.findIndex(label => {
    return (
      (statusFilter === 'BIM' && label === 'BIM') ||
      (statusFilter === 'SITE' && label === 'SITE') ||
      (statusFilter === 'CM' && label === 'CM') ||
      (statusFilter === 'อนุมัติ' && label === 'อนุมัติ')
    );
  });
  
  if (index !== -1) {
    totalToShow = data.datasets[0].data[index];
  }
}

return (
  <div className="donut-center-text">
    <div className="count-label">จำนวนเอกสารรวม</div>
    <div className="count-value">{totalToShow}</div>
  </div>
);
};

// รวมคำสั่ง JSX สำหรับแสดงผล
return (
<div className="rfa-dashboard-container">
  <h1>การติดตามสถานะการแบบก่อสร้าง</h1>
  {/* แสดง Loading spinner สำหรับทั้งหน้า */}

  {(loading || isInitialLoad) && (
    <div className="spinner-container">
      <div className="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  )}
  
  <div className="dashboard-header">
    {/* ส่วนเลือกโครงการและปุ่ม */}
    {user?.jobPosition === 'BIM' && (
      <div className="site-selector">
        <label htmlFor="site">โครงการ:</label>
        <select 
          id="site" 
          value={selectedSite} 
          onChange={handleSiteChange}
          disabled={loading}
        >
          <option value="">เลือกโครงการ</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>
              {site.site_name}
            </option>
          ))}
        </select>
      </div>
    )}
          
    {/* ปุ่มส่งเอกสารใหม่ */}
    {canCreateNewDocument(user?.jobPosition) && selectedSite && (
      <button 
        className="new-document-btn"
        onClick={handleNewDocumentClick}
        disabled={loading}
      >
        ส่งเอกสารใหม่
      </button>
    )}
    
    {/* ปุ่ม Export CSV */}
    <button 
      className="export-btn"
      onClick={exportToCSV}
      disabled={loading || isExporting || filteredDocuments.length === 0}
    >
      {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
    </button>
  </div>

  {/* แสดงข้อความ Error หรือ Success */}
  {error && <div className="error-message">{error}</div>}
  {success && <div className="success-message">{success}</div>}

  {/* ส่วนแสดงโดนัทชาร์ต */}
  <div className="dashboard-charts">
    {chartData === null ? (
      <div className="chart-container">
        <h2>สัดส่วนแสดงสถานะแบบก่อสร้าง</h2>
        <p className="chart-empty-message">
          ไม่มีข้อมูลเอกสารในโครงการนี้
        </p>
      </div>
    ) : (
      <div className="chart-container">
        <h2>สัดส่วนแสดงสถานะแบบก่อสร้าง</h2>
        <div className="donut-chart">
          <div className="chart-wrapper">
            <Doughnut data={chartData} options={chartOptions} />
            <DonutCenterText data={chartData} statusFilter={statusFilter} />
          </div>
        </div>
        <div className="chart-note">
          *คลิกที่ส่วนต่างๆ ของแผนภูมิเพื่อกรองข้อมูลตามผู้รับผิดชอบ
        </div>
      </div>
    )}
  </div>

  {/* ส่วนค้นหาและตัวกรอง */}
  <div className="search-filter-section">
    <div className="search-box">
      <input
        type="text"
        placeholder="ค้นหาเอกสาร (ST-001_01 หรือชื่อเอกสาร)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
    </div>
    
    <div className="filter-options">
      <label className="filter-label">
        <input
          type="checkbox"
          checked={showLatestRevOnly}
          onChange={(e) => {
            console.log("Checkbox changed:", e.target.checked);
            setShowLatestRevOnly(e.target.checked);
          }}
        />
        แสดงเฉพาะฉบับล่าสุด
      </label>
      
      <select 
        value={statusFilter} 
        onChange={(e) => setStatusFilter(e.target.value)}
        className="status-filter"
      >
        <option value="all">ทุกสถานะ</option>
        <option value="BIM">BIM</option>
        <option value="SITE">SITE</option>
        <option value="CM">CM</option>
        <option value="อนุมัติ">อนุมัติ</option>
      </select>
    </div>
  </div>
  
  {/* แสดงตารางเอกสาร */}
  {filteredDocuments.length > 0 ? (
    <div className="table-container">
      <table className="documents-table">
        <thead>
          <tr>
            <th>หมายเลขเอกสาร</th>
            <th>รายชื่อเอกสาร</th>
            <th>วันที่ส่ง shop</th>
            <th>วันที่ส่งอนุมัติ</th>
            <th>วันที่รับผลอนุมัติ</th>
            <th>ผลการอนุมัติ</th>
            <th>ค้างดำเนินการ (วัน)</th>
            <th>ผู้รับผิดชอบ</th>
            <th>ไฟล์แนบ</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map((doc) => {
            const documentId = doc.full_document_number || `${doc.category_code}-${doc.document_number}_${doc.revision_number}`;
            const responsibleParty = getResponsibleParty(doc);
            const pendingDays = calculatePendingDays(doc);
            
            // กำหนด class สำหรับแถวตามสถานะ
            let rowClassName = '';
            if (responsibleParty === 'BIM') rowClassName = 'status-bim';
            else if (responsibleParty === 'SITE') rowClassName = 'status-site';
            else if (responsibleParty === 'CM') rowClassName = 'status-cm';
            else if (responsibleParty === 'อนุมัติ') rowClassName = 'status-approved';
            
            return (
              <tr 
                key={doc.id}
                className={`${rowClassName} ${selectedDocument && selectedDocument.id === doc.id ? 'selected-row' : ''}`}
                onClick={() => showDocumentDetails(doc)}
              >
                <td>{documentId}</td>
                <td>{doc.title}</td>
                <td>{doc.created_at || '-'}</td>
                <td>{doc.send_approval_date || '-'}</td>
                <td>{doc.approval_date || '-'}</td>
                <td>{doc.status}</td>
                <td>{pendingDays}</td>
                <td>{responsibleParty}</td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="no-documents-message">
      {documents.length === 0 ? 'ไม่มีข้อมูลเอกสารในโครงการนี้' : 'ไม่พบเอกสารที่ตรงกับเงื่อนไข'}
    </div>
  )}
  
  {/* แสดงฟอร์มรายละเอียดเอกสาร - ใช้คอมโพเนนต์ใหม่ */}
  {selectedDocument && (
    user?.jobPosition === 'BIM' && 
    ['แก้ไข', 'ไม่อนุมัติ', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)'].includes(selectedDocument.status) ? (
      <DocumentUpdateForm
        document={selectedDocument}
        onSubmit={handleStatusUpdateSubmit}
        onClose={handleFormClose}
        loading={loading}
      />
    ) : (
      <DocumentStatusForm
        document={selectedDocument}
        user={user}
        onSubmit={handleStatusUpdateSubmit}
        onClose={handleFormClose}
        loading={loading}
      />
    )
  )}
  
  {/* แสดงฟอร์มส่งเอกสารใหม่ - ใช้คอมโพเนนต์ใหม่ */}
  {showNewDocumentForm && canCreateNewDocument(user?.jobPosition) && (
    <div className="new-document-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>เพิ่มเอกสารใหม่</h2>
          <button 
            type="button"
            className="close-button"
            onClick={handleNewDocumentClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>
        
        {/* แสดงข้อความสำเร็จเฉพาะใน modal นี้ */}
        {newDocumentSuccess && (
          <div className="success-message modal-success">
            {newDocumentSuccess}
          </div>
        )}
        
        {/* แสดงข้อความ error ใน modal นี้ด้วย (ถ้ามี) */}
        {error && (
          <div className="error-message modal-error">
            {error}
          </div>
        )}
        
        <DocumentUploadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleNewDocumentSubmit}
          loading={loading}
          onClose={handleNewDocumentClose}
          categories={categories}
        />
      </div>
    </div>
  )}

  {/* Success Modal */}
  {showSuccessModal && (
    <SuccessModal 
      message={successMessage}
      onClose={() => setShowSuccessModal(false)}
    />
  )}        
</div>
);
};

// คอมโพเนนต์หลักที่ใช้ Provider
const RfaDashboard = ({ user }) => {
return (
<DocumentProvider>
  <RfaDashboardContent user={user} />
</DocumentProvider>
);
};

export default RfaDashboard;