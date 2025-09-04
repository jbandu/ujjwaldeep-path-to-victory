import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { usePremium } from '@/hooks/usePremium';
import { RefreshCw } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onClose?: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onClose }) => {
  const { refetch, loading } = usePremium();

  const handleRefresh = async () => {
    await refetch();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Premium required</DialogTitle>
          <DialogDescription>
            Upgrade to access this feature. If you just made a payment, click refresh to update your status.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Link to="/pricing">
            <Button>Upgrade for ₹999/mo</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
