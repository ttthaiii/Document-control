import React from 'react';
import { useNavigate } from 'react-router-dom';

const DocumentRequest = () => {
  const navigate = useNavigate();

  return (
    <div className="document-request-container">
      <h1>Document Request</h1>
      {/* เพิ่มเนื้อหาของหน้า Document Request */}
      <button onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default DocumentRequest;