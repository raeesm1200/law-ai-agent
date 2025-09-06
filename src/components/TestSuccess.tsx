import React from 'react';

export const TestSuccess: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>🎉 SUCCESS PAGE LOADED!</h1>
      <p>Current URL: {window.location.href}</p>
      <p>Current Path: {window.location.pathname}</p>
      <p>Query Params: {window.location.search}</p>
      <p>If you see this, the routing is working correctly.</p>
    </div>
  );
};
