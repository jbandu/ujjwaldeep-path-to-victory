import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Invalid signature', { status: 400 });
  }
  const event = JSON.parse(body);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || ''
  );

  switch (event.event) {
    case 'payment.captured': {
      const p = event.payload.payment.entity;
      await supabase.from('payments').upsert({
        provider_payment_id: p.id,
        provider_order_id: p.order_id,
        amount_inr: Math.round(p.amount / 100),
        currency: p.currency,
        status: p.status,
        method: p.method,
        raw: event,
        user_id: p.notes?.user_id || null
      });
      break;
    }
    case 'subscription.activated':
    case 'subscription.charged': {
      const s = event.payload.subscription.entity;
      await supabase.from('user_subscriptions').upsert({
        provider_subscription_id: s.id,
        status: s.status,
        current_period_start: new Date(s.current_start * 1000).toISOString(),
        current_period_end: new Date(s.current_end * 1000).toISOString(),
        user_id: s.notes?.user_id || null,
        autopay: s.charge_at !== null
      });
       const { error: invoiceError } = await supabase.from('invoices').insert({
         user_id: s.notes?.user_id || null,
         subscription_id: null,
         amount_inr: Math.round(s.plan.amount / 100),
         period_start: new Date(s.current_start * 1000).toISOString(),
         period_end: new Date(s.current_end * 1000).toISOString(),
         status: 'paid',
         raw: event
       });
       if (invoiceError) console.error('Invoice insert error:', invoiceError);
      break;
    }
    case 'subscription.halted':
    case 'subscription.cancelled': {
      const s = event.payload.subscription.entity;
      await supabase.from('user_subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('provider_subscription_id', s.id);
      break;
    }
    case 'payment.failed': {
      const p = event.payload.payment.entity;
      await supabase.from('payments').upsert({
        provider_payment_id: p.id,
        status: 'failed',
        amount_inr: Math.round(p.amount / 100),
        currency: p.currency,
        method: p.method,
        raw: event,
        user_id: p.notes?.user_id || null
      });
      break;
    }
  }

  return new Response('ok');
}
