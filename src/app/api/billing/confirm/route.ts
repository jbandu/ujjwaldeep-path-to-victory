import { createClient } from '@supabase/supabase-js';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';

export async function POST(req: Request) {
  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || ''
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('payments').insert({
      user_id: user.id,
      provider_payment_id: razorpay_payment_id,
      provider_order_id: razorpay_order_id,
      amount_inr: 999,
      status: 'captured'
    });
  }

  return Response.json({ ok: true });
}
