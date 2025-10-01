// src/App.js
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StaffDashboard from './staff/page';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      // Always verify with server - never trust client-side storage
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        if (data.user_role === 'staff') {
          // Only set sessionStorage after server confirmation
          sessionStorage.setItem('user_role', 'staff');
          setIsAuthenticated(true);
        } else {
          // Clear any potentially tampered sessionStorage
          sessionStorage.removeItem('user_role');
          router.push('/login');
        }
      })
      .catch(() => {
        // Clear any potentially tampered sessionStorage
        sessionStorage.removeItem('user_role');
        router.push('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
    };

    checkAuth();

    // Set up periodic re-validation every 30 seconds to prevent session hijacking
    const interval = setInterval(() => {
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        if (data.user_role !== 'staff') {
          // Role changed or session expired
          sessionStorage.removeItem('user_role');
          router.push('/login');
        }
      })
      .catch(() => {
        // Server error - redirect to login for security
        sessionStorage.removeItem('user_role');
        router.push('/login');
      });
    }, 30000); // Check every 30 seconds

    // Add security check on page focus to catch tampering attempts
    const handleFocus = () => {
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        if (data.user_role !== 'staff') {
          sessionStorage.removeItem('user_role');
          router.push('/login');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('user_role');
        router.push('/login');
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div>
      <StaffDashboard/>
    </div>
  );
};

export default App;
