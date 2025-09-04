import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("Billing checkout called with mode:", mode);
    console.log("User:", user.email);

    // Check if RAZORPAY_KEY_ID is set for real integration
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const isDemo = !razorpayKeyId || razorpayKeyId === "rzp_test_mock";

    if (isDemo) {
      // Demo mode - simulate successful payment without Razorpay
      console.log("Demo mode: Creating mock successful payment");
      
      // Simulate payment success directly
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Create payment record
      await supabaseService.from('payments').insert({
        user_id: user.id,
        provider_payment_id: "demo_payment_" + Date.now(),
        provider_order_id: "demo_order_" + Date.now(),
        amount_inr: 999,
        status: 'captured'
      });

      // Create subscription
      await supabaseService.from('user_subscriptions').upsert({
        user_id: user.id,
        provider_subscription_id: "demo_sub_" + Date.now(),
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autopay: true
      });

      return new Response(JSON.stringify({
        demo_mode: true,
        success: true,
        message: "Demo payment successful! Premium features activated."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Real Razorpay integration would go here
    if (mode === 'subscription') {
      return new Response(JSON.stringify({
        subscription_id: "sub_mock_" + Date.now(),
        key_id: razorpayKeyId,
        user_email: user.email
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      order_id: "order_mock_" + Date.now(),
      amount: 99900,
      currency: "INR",
      key_id: razorpayKeyId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});