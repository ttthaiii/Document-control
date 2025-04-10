import React, { useState } from 'react';

const ApprovedDocumentTable = ({ documents = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const approvedStatuses = [
    'อนุมัติ',
    'อนุมัติตามคอมเมนต์ (ไม่ต้องแก้ไข)',
    'อนุมัติตามคอมเมนต์ (ต้องแก้ไข)'
  ];

  const filteredDocuments = documents.filter(doc => {
    if (!approvedStatuses.includes(doc.status)) return false;
    const term = searchTerm.toLowerCase();
    const docId = `${doc.full_document_number || ''}_${doc.revision_number || ''}`.toLowerCase();
    const title = (doc.title || '').toLowerCase();
    return docId.includes(term) || title.includes(term);
  });

  return (
    <div className="table-container">
      <div className="search-box">
        <input
          type="text"
          placeholder="ค้นหาเอกสาร (เช่น ST-001_01 หรือชื่อเอกสาร)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      <table className="documents-table">
        <thead>
          <tr>
            <th>No</th>
            <th>เลขที่เอกสาร</th>
            <th>รายชื่อเอกสาร</th>
            <th>Rev.No</th>
            <th>วันที่อนุมัติ</th>
            <th>ไฟล์แนบ</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-table-message">
                ไม่พบเอกสารที่อนุมัติแล้วในโครงการของคุณ
              </td>
            </tr>
          ) : (
            filteredDocuments.map((doc, index) => (
              <tr key={doc.id}>
                <td>{index + 1}</td>
                <td>{doc.full_document_number}</td>
                <td>{doc.title}</td>
                <td>{doc.revision_number}</td>
                <td>{doc.approval_date || '-'}</td>
                <td>
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-file-link"
                    >
                      {doc.file_name || 'ดูไฟล์'}
                    </a>
                  ) : (
                    <span className="no-file">ไม่มีไฟล์แนบ</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ApprovedDocumentTable;