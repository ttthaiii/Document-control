import { useState } from 'react';

export const useFileUpload = (initialFiles = []) => {
  const [files, setFiles] = useState(initialFiles);
  
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // รีเซ็ตค่า input
  };
  
  const handleRemoveFile = (index) => {
    setFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };
  
  return { files, setFiles, handleFileChange, handleRemoveFile };
};