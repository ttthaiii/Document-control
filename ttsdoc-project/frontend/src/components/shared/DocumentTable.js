// src/components/shared/DocumentTable.js
import React from 'react';
import { useDocumentContext } from '../../contexts/DocumentContext';

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

  // คำนวณจำนวนวันที่ค้างดำเนินการ
  const calculatePendingDays = (document) => {
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
                {!isAdmin && <td>{doc.created_at || '-'}</td>}
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