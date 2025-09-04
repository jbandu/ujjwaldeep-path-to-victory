import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface PaywallModalProps {
  open: boolean;
  onClose?: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Premium required</DialogTitle>
          <DialogDescription>
            Upgrade to access this feature.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Link to="/pricing">
            <Button>Upgrade for ₹999/mo</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
