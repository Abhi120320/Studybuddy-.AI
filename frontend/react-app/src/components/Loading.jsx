import React from 'react';

const Loading = ({ message = 'Processing...' }) => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p style={{ fontWeight: '500' }}>{message}</p>
    </div>
  );
};

export default Loading;
