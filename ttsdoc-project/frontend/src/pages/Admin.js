// filepath: /d:/OneDrive - T.T.S.Engineering(2004) Co., Ltd/TTSdoc/ttsdoc-project/frontend/src/pages/Admin.js
import React, { useEffect, useState } from 'react';
import './Admin.css'; // Import CSS file

const Admin = () => {
    const [data, setData] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/admin/data');
                const result = await response.json();
                if (response.ok) {
                    setData(result);
                } else {
                    setError(result.error || 'Failed to fetch data');
                }
            } catch (err) {
                console.error('Error:', err);
                setError('An error occurred while fetching data');
            }
        };

        fetchData();
    }, []);

    return (
        <div className="admin-container">
            <h1>Admin Dashboard</h1>
            {error && <div className="error-message">{error}</div>}
            <div className="data-list">
                {data.map((item, index) => (
                    <div key={index} className="data-item">
                        {item.name}: {item.value}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;