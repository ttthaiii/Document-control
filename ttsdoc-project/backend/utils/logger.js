// backend/utils/logger.js
const logger = {
    info: (message, data = {}) => {
      console.log(`[INFO] ${message}`, data);
    },
    error: (message, error) => {
      console.error(`[ERROR] ${message}`, {
        message: error.message,
        stack: error.stack,
        ...(error.sql && { sql: error.sql }),
        ...(error.sqlMessage && { sqlMessage: error.sqlMessage })
      });
    },
    debug: (message, data = {}) => {
      console.log(`[DEBUG] ${message}`, data);
    },
    warn: (message, data = {}) => {
      console.warn(`[WARN] ${message}`, data);
    }
  };
  
  module.exports = logger;