import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Billing: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('billing-portal');
      if (error) throw error;
      setData(result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async () => {
    try {
      const { error } = await supabase.functions.invoke('billing-portal', {
        body: {},
        method: 'POST'
      });
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Subscription cancelled successfully"
      });
      
      await load();
    } catch (error: any) {
      toast({
        title: "Error", 
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    }
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
