'use client';
import React, { useEffect } from 'react';
import CustomerDashboard from './customer/page';
import { useRouter } from 'next/navigation';

const App = () => {
  const router = useRouter();

  useEffect(() => {
    const handleBack = () => {
      router.push('/customerdashboard'); // Redirect to the same page or any other desired route
    };

    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', handleBack);

    return () => {
      window.removeEventListener('popstate', handleBack);
    };
  }, [router]);

  return (
    <div>
      <CustomerDashboard />
    </div>
  );
};

export default App;
