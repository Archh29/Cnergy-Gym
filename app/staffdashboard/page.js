// src/App.js
'use client';
import React from 'react';
import StaffDashboard from './staff/page';

const App = () => {
  // No authentication logic here - main page handles this
  return (
    <div>
      <StaffDashboard/>
    </div>
  );
};

export default App;