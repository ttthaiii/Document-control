import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkRequest = () => {
  const navigate = useNavigate();

  return (
    <div className="work-request-container">
      <h1>Work Request</h1>
      {/* เพิ่มเนื้อหาของหน้า Work Request */}
      <button onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default WorkRequest;