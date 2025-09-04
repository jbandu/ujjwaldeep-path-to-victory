import { createClient } from '@supabase/supabase-js';
import { createSubscription, createOrder } from '@/lib/payments/razorpay';

export async function POST(req: Request) {
  const { mode } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || ''
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (mode === 'subscription') {
    const sub = await createSubscription(user.email || '');
    return Response.json({
      subscription_id: sub.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      user_email: user.email
    });
  }

  const order = await createOrder();
  return Response.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID
  });
}
