import React from 'react';
import { Button } from '@/components/ui/button';

const Pricing: React.FC = () => {
  const upgrade = async () => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'subscription' })
    });
    const data = await res.json();
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
        handler: (resp: any) => {
          fetch('/api/billing/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resp)
          });
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
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
