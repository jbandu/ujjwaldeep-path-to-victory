import { createClient } from '@supabase/supabase-js';
import { cancelSubscription } from '@/lib/payments/razorpay';

async function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || ''
  );
}

export async function GET() {
  const supabase = await getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return Response.json({ subscription, invoices });
}

export async function POST() {
  const supabase = await getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subscription?.provider_subscription_id) {
    await cancelSubscription(subscription.provider_subscription_id);
    await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled', cancel_at: new Date().toISOString() })
      .eq('id', subscription.id);
  }

  return Response.json({ ok: true });
}
