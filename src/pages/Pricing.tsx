import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const Pricing: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const upgrade = async () => {
    try {
      console.log("Starting upgrade process...");
      
      const { data, error } = await supabase.functions.invoke('billing-checkout', {
        body: { mode: 'subscription' }
      });
      
      console.log("Billing checkout response:", { data, error });
      
      if (error) {
        console.error("Billing checkout error:", error);
        throw error;
      }
      
      // Check if this is demo mode
      if (data.demo_mode) {
        // Invalidate premium status to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['billing-status'] });
        
        toast({
          title: "Demo Payment Successful!",
          description: data.message || "Premium features activated in demo mode."
        });
        // Redirect to app after successful demo payment
        setTimeout(() => {
          window.location.href = '/app';
        }, 1000);
        return;
      }
      
      if (data.subscription_id) {
        console.log("Processing Razorpay payment...");
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
            
            // Invalidate premium status to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['billing-status'] });
            
            toast({
              title: "Success!",
              description: "Payment successful! Your premium subscription is now active."
            });
            // Redirect to app after successful payment
            setTimeout(() => {
              window.location.href = '/app';
            }, 1000);
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
      console.error("Upgrade process error:", error);
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
