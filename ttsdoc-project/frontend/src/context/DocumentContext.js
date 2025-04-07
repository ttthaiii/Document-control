// src/contexts/DocumentContext.js
import React, { createContext, useState, useContext } from 'react';

const DocumentContext = createContext();

export function useDocumentContext() {
  return useContext(DocumentContext);
}

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  
  // ฟังก์ชันสำหรับแสดงข้อความ error
  const showError = (message) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 5000);
  };

  // ฟังก์ชันสำหรับแสดงข้อความ success
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess('');
    }, 5000);
  };

  const value = {
    documents,
    setDocuments,
    filteredDocuments,
    setFilteredDocuments,
    selectedDocument,
    setSelectedDocument,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    showError,
    showSuccess
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}