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
    if (!document || (!document.updated_at && !document.created_at)) return 0;
    
    const lastUpdateDate = document.updated_at || document.created_at;
    
    let updateDate;
    
    if (typeof lastUpdateDate === 'string' && lastUpdateDate.includes('/')) {
      const parts = lastUpdateDate.split('/');
      updateDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      updateDate = new Date(lastUpdateDate);
    }
    
    const currentDate = new Date();
    
    if (isNaN(updateDate.getTime())) return 0;
    
    const diffTime = Math.abs(currentDate - updateDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
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