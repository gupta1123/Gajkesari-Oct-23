"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import DailyPricingModal from '@/components/DailyPricingModal';

const DailyPricingChecker = () => {
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);

  const getUserRole = () => {
    // Retrieve role from localStorage like the reference implementation
    if (typeof window !== 'undefined') {
      return localStorage.getItem('role') || null;
    }
    return null;
  };

  const checkDailyPricing = useCallback(async () => {
    if (!token || hasCheckedToday) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`https://api.gajkesaristeels.in/brand/getByDateRange?start=${today}&end=${today}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const gajkesariBrand = data.find((item: Record<string, unknown>) => item.brandName === 'Gajkesari');
      
      // Show modal if:
      // 1. No brand found with name Gajkesari
      // 2. OR brand not assigned to admin with employeeDto.id === 86 
      if (!gajkesariBrand || (gajkesariBrand.employeeDto && gajkesariBrand.employeeDto.id !== 86)) {
        const userRole = getUserRole();
        if (userRole === 'ADMIN') {
          setIsModalOpen(true);
        }
      }
      
      setHasCheckedToday(true); // Prevent multiple checks
      
    } catch (error) {
      console.error('Error checking daily pricing:', error);
    }
  }, [token, hasCheckedToday]);

  // Check for daily pricing once token is available
  useEffect(() => {
    checkDailyPricing();
  }, [checkDailyPricing]);

  const handleCreateSuccess = () => {
    console.log('Daily pricing created successfully');
    // Optionally refresh App or notify other components
  };

  return <DailyPricingModal 
    open={isModalOpen} 
    onOpenChange={setIsModalOpen}
    onCreateSuccess={handleCreateSuccess}
  />;
};

export default DailyPricingChecker;
