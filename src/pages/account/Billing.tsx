import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Billing: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const res = await fetch('/api/billing/portal');
    if (res.ok) setData(await res.json());
  };

  useEffect(() => { load(); }, []);

  const cancel = async () => {
    await fetch('/api/billing/portal', { method: 'POST' });
    await load();
  };

  if (!data) return <div className="p-4">Loading...</div>;

  const sub = data.subscription;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {sub ? (
            <>
              <p className="mb-2">Status: {sub.status}</p>
              {sub.current_period_end && (
                <p className="mb-4">Renews on {new Date(sub.current_period_end).toLocaleDateString('en-IN')}</p>
              )}
              {sub.status === 'active' && (
                <Button variant="outline" onClick={cancel}>Cancel Renewal</Button>
              )}
            </>
          ) : (
            <p>No subscription. <a href="/pricing" className="text-blue-600 underline">Upgrade</a></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
