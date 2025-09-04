import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Pricing: React.FC = () => {
  const { toast } = useToast();
  
  const upgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('billing-checkout', {
        body: { mode: 'subscription' }
      });
      
      if (error) throw error;
      
      if (data.subscription_id) {
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'UjjwalDeep',
        description: 'Premium Monthly',
        handler: async (resp: any) => {
          try {
            const { error } = await supabase.functions.invoke('billing-confirm', {
              body: resp
            });
            if (error) throw error;
            toast({
              title: "Success!",
              description: "Payment successful! Your premium subscription is now active."
            });
            // Redirect to app after successful payment
            window.location.href = '/app';
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message || "Payment confirmation failed",
              variant: "destructive"
            });
          }
        }
      };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 text-center">
      <h1 className="text-3xl font-bold mb-4">Premium</h1>
      <p className="mb-6">Access tests, print packages and analytics for ₹999/month.</p>
      <Button onClick={upgrade}>Upgrade</Button>
    </div>
  );
};

export default Pricing;
