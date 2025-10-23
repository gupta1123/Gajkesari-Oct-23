"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface DailyPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess?: () => void;
}

const DailyPricingModal = ({ open, onOpenChange, onCreateSuccess }: DailyPricingModalProps) => {
  const { token } = useAuth();
  const [newBrand, setNewBrand] = useState({
    brandName: 'Gajkesari',
    price: '',
    city: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleResetForm = () => {
    setNewBrand({
      brandName: 'Gajkesari',
      price: '',
      city: ''
    });
  };

  // Reset form when open/close
  useEffect(() => {
    if (!open) handleResetForm();
  }, [open]);

  const handleCreateBrand = async () => {
    setIsLoading(true);
    try {
      const newBrandData = {
        ...newBrand,
        price: parseFloat(newBrand.price),
        employeeDto: { id: 86 }
      };

      const response = await fetch('https://api.gajkesaristeels.in/brand/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBrandData),
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      onOpenChange(false);
      onCreateSuccess?.();
      
    } catch (error) {
      console.error('Error creating pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader>
          <DialogTitle>Create Pricing</DialogTitle>
          <DialogDescription>
            Daily Pricing for today has not been created. Please fill out the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={newBrand.brandName}
              disabled
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              value={newBrand.price}
              onChange={(e) => setNewBrand({ ...newBrand, price: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={newBrand.city}
              onChange={(e) => setNewBrand({ ...newBrand, city: e.target.value })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreateBrand}
            disabled={isLoading || !newBrand.price || !newBrand.city}
            type="button"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyPricingModal;
