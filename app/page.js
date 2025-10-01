'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import AdminDashboard from './admindashboard/page'; // Import AdminDashboard for admin role
import StaffDashboard from './staffdashboard/page'; // Import StaffDashboard for staff role


const Home = () => {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter(); // Initialize the useRouter hook

  useEffect(() => {
    // Simple check - only look at sessionStorage, no API calls
    const storedRole = sessionStorage.getItem('user_role');
    
    if (storedRole === 'admin' || storedRole === 'staff') {
      setUserRole(storedRole);
    } else {
      // No valid session, redirect to login
      sessionStorage.clear();
      router.push('/login');
    }
  }, [router]);

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
