'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import AdminDashboard from './admindashboard/page'; // Import AdminDashboard for admin role
import StaffDashboard from './staffdashboard/page'; // Import StaffDashboard for staff role


const Home = () => {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter(); // Initialize the useRouter hook

  useEffect(() => {
    // Always verify with server - never trust client-side storage
    fetch('https://api.cnergy.site/session.php', {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.user_role === 'admin' || data.user_role === 'staff') {
        // Only set sessionStorage after server confirmation
        sessionStorage.setItem('user_role', data.user_role);
        setUserRole(data.user_role);
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
    });
  }, [router]); // Dependency array ensures the effect runs once

  const renderDashboard = () => {
    if (userRole === 'admin') {
      return <AdminDashboard />;  // Render AdminDashboard for admin role
    } else if (userRole === 'staff') {
      return <StaffDashboard />;  // Render StaffDashboard for staff role
    } else {
      return <p>Redirecting to login...</p>;  // Show a message if no role is found
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      {userRole ? renderDashboard() : <p>Loading...</p>} {/* Show loading or redirecting message */}
    </div>
  );
};

export default Home;
