'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import AdminDashboard from './admindashboard/page'; // Import AdminDashboard for admin role
import StaffDashboard from './staffdashboard/page'; // Import StaffDashboard for staff role
import CustomerDashboard from './customerdashboard/page';


const Home = () => {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter(); // Initialize the useRouter hook

  useEffect(() => {
    // Check if a user role is stored in sessionStorage
    const storedRole = sessionStorage.getItem('user_role');
    if (storedRole === 'admin') {
      setUserRole(storedRole); // Set role to admin
    } else if (storedRole === 'staff') {
      setUserRole(storedRole); 
    }// Set role to staff
      else if (storedRole === 'customer') {
        setUserRole(storedRole); // Set role to customer
    } else {
      // Redirect to login page if role is not admin or staff
      router.push('/login'); // Redirect to login page
    }
  }, [router]); // Dependency array ensures the effect runs once

  const renderDashboard = () => {
    if (userRole === 'admin') {
      return <AdminDashboard />;  // Render AdminDashboard for admin role
    } else if (userRole === 'staff') {
      return <StaffDashboard />;  // Render StaffDashboard for staff role
    }else if (userRole === 'customer') {
        return <CustomerDashboard />;  // Render StaffDashboard for staff role
      }
     else {
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
