// src/utils/documentUtils.js
export const DOCUMENT_STATUSES = {
    BIM_SENT: 'BIM ส่งแบบ',
    SEND_TO_CM: 'ส่ง CM',
    EDIT: 'แก้ไข',
    APPROVED: 'อนุมัติ',
    APPROVED_WITH_COMMENT_NO_EDIT: 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
    APPROVED_WITH_COMMENT_EDIT: 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)',
    REJECTED: 'ไม่อนุมัติ'
  };

  export const getResponsibleParty = (document) => {
    const status = document.status;
    
    if (status === 'BIM ส่งแบบ') {
      return 'SITE';
    } else if (status === 'ส่ง CM') {
      return 'CM';
    } else if (['แก้ไข', 'ไม่อนุมัติ', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)'].includes(status)) {
      return 'BIM';
    } else if (['อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)'].includes(status)) {
      return 'อนุมัติ';
    }
    
    return 'SITE'; // Default
  };
  
  export const calculatePendingDays = (document) => {
    if (!document) return 0;
  
    if (document.has_newer_revision) return 0;
  
    if (document.approval_date &&
      ['อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)'].includes(document.status)) {
      return 0;
    }
  
    let referenceDate;
    if (document.status === 'BIM ส่งแบบ') {
      referenceDate = document.shop_date || document.created_at;
    } else if (document.status === 'ส่ง CM') {
      referenceDate = document.send_approval_date || document.updated_at;
    } else if (['อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ', 'แก้ไข'].includes(document.status)) {
      referenceDate = document.approval_date || document.updated_at;
    } else {
      referenceDate = document.updated_at || document.created_at;
    }
  
    if (!referenceDate) return 0;
  
    let updateDate;
    if (typeof referenceDate === 'string' && referenceDate.includes('/')) {
      const parts = referenceDate.split('/');
      updateDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      updateDate = new Date(referenceDate);
    }
  
    if (isNaN(updateDate.getTime())) return 0;
  
    const currentDate = new Date();
    const diffTime = currentDate - updateDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // ✅ ปัดลง
  
    return diffDays;
  };
  
  export const canEditDocument = (jobPosition, documentStatus) => {
    if (!jobPosition || !documentStatus) return false;
    
    // กำหนดสถานะที่แต่ละตำแหน่งสามารถแก้ไขได้
    const EDITABLE_STATUSES = {
      'BIM': ['แก้ไข', 'ไม่อนุมัติ', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)'],
      'Adminsite': ['BIM ส่งแบบ', 'ส่ง CM'],
      'Adminsite2': ['BIM ส่งแบบ'],
      'CM': ['ส่ง CM']
    };
    
    return EDITABLE_STATUSES[jobPosition]?.includes(documentStatus) || false;
  };
  
  export const getAllowedStatusOptions = (jobPosition, currentStatus) => {
    // กรณีพิเศษสำหรับ Adminsite ที่ขึ้นกับสถานะปัจจุบันของเอกสาร
    if (jobPosition === 'Adminsite' && currentStatus) {
      const ADMINSITE_STATUS_OPTIONS = {
        'BIM ส่งแบบ': ['ส่ง CM', 'แก้ไข'],
        'ส่ง CM': ['อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ']
      };
      return ADMINSITE_STATUS_OPTIONS[currentStatus] || [];
    }
    
    // กรณีทั่วไป ตาม jobPosition
    const ALLOWED_UPDATE_STATUSES = {
      'Adminsite': ['ส่ง CM', 'แก้ไข', 'อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ'],
      'Adminsite2': ['ส่ง CM', 'แก้ไข'],
      'CM': ['อนุมัติ', 'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)', 'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)', 'ไม่อนุมัติ']
    };
    
    return ALLOWED_UPDATE_STATUSES[jobPosition] || [];
  };
  
  export const canCreateNewDocument = (jobPosition) => {
    return jobPosition === 'BIM';
  };