// src/components/shared/DocumentTable.js
import React from 'react';
import { useDocumentContext } from '../../contexts/DocumentContext';
import { calculatePendingDays } from '../../utils/documentUtils';

const DocumentTable = ({ onRowClick, isAdmin = false }) => {
  const { filteredDocuments, selectedDocument } = useDocumentContext();

  // ฟังก์ชันช่วยเหลือสำหรับหาผู้รับผิดชอบตามสถานะ
  const getResponsibleParty = (document) => {
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

/*  // คำนวณจำนวนวันที่ค้างดำเนินการ
  const calculatePendingDays = (document) => {
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
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // ✅ ใช้ floor
  
    return diffDays;
  };
  */

  if (filteredDocuments.length === 0) {
    return (
      <div className="no-documents-message">
        ไม่พบเอกสารที่ตรงกับเงื่อนไข
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className={isAdmin ? "results-table" : "documents-table"}>
        <thead>
          <tr>
            {isAdmin && <th>No</th>}
            <th>หมายเลขเอกสาร</th>
            <th>รายชื่อเอกสาร</th>
            {!isAdmin && <th>วันที่ส่ง shop</th>}
            {!isAdmin && <th>วันที่ส่งอนุมัติ</th>}
            {!isAdmin && <th>วันที่รับผลอนุมัติ</th>}
            <th>สถานะ</th>
            {!isAdmin && <th>ค้างดำเนินการ (วัน)</th>}
            {!isAdmin && <th>ผู้รับผิดชอบ</th>}
            <th>ไฟล์แนบ</th>
            {isAdmin && <th>วันที่</th>}
            {isAdmin && <th>ผู้ส่ง</th>}
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map((doc, index) => {
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
                onClick={() => onRowClick(doc)}
              >
                {isAdmin && <td>{index + 1}</td>}
                <td>{documentId}</td>
                <td>{doc.title}</td>
                {!isAdmin && <td>
                  {(() => {
                    console.log('Document data:', doc.id, {
                      shop_date: doc.shop_date,
                      created_at: doc.created_at
                    });
                    
                    // กรณีที่ 1: มีวันที่ shop_date - ใช้เมื่อมีการอัปเดตจากแก้ไขเป็น BIM ส่งแบบ
                    if (doc.shop_date) {
                      return doc.shop_date;
                    }
                    // กรณีที่ 2: ใช้วันที่สร้างเอกสาร
                    return doc.created_at || '-';
                  })()}
                </td>}
                {!isAdmin && <td>{doc.send_approval_date || '-'}</td>}
                {!isAdmin && <td>{doc.approval_date || '-'}</td>}
                <td>{doc.status}</td>
                {!isAdmin && <td>{pendingDays}</td>}
                {!isAdmin && <td>{responsibleParty}</td>}
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
                {isAdmin && <td>{doc.updated_at || doc.created_at}</td>}
                {isAdmin && <td>{doc.updated_by_name || doc.created_by_name}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentTable;