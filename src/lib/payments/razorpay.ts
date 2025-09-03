import crypto from 'node:crypto';

const BASE_URL = 'https://api.razorpay.com/v1';

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return `Basic ${token}`;
}

export async function createSubscription(email: string) {
  const body = {
    plan: {
      period: 'monthly',
      interval: 1,
      item: { name: 'Premium (Monthly)', amount: 99900, currency: 'INR' }
    },
    customer_notify: 1,
    total_count: 12,
    notes: { email }
  };

  const res = await fetch(`${BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function createOrder() {
  const body = {
    amount: 99900,
    currency: 'INR',
    payment_capture: 1
  };
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const hmac = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return hmac === signature;
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

export async function cancelSubscription(subId: string) {
  const res = await fetch(`${BASE_URL}/subscriptions/${subId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}
