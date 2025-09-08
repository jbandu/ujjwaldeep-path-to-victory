import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-supabase-signature",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const secret = Deno.env.get("AUTH_HOOK_SECRET") || Deno.env.get("HOOK_SECRET") || ""
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const bearerOk = auth.startsWith("Bearer ") && auth.slice(7) === secret

  const bodyText = await req.text()

  let hmacOk = false
  const sig = req.headers.get("x-supabase-signature")
  try {
    if (sig && secret) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      )
      const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText))
      const digest = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("")
      hmacOk = crypto.timingSafeEqual(
        new TextEncoder().encode(sig),
        new TextEncoder().encode(digest),
      )
    }
  } catch (_) {
    // ignore
  }

  if (!bearerOk && !hmacOk && secret) {
    console.warn("Auth hook: missing or invalid authorization; processing anyway for development")
  }

  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch (_) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const action = payload?.auth_event?.action || "unknown"
  const email = payload?.auth_event?.actor_username || payload?.auth_event?.user?.email as string | undefined
  console.log("Auth hook action:", action, "email:", email)
  console.log("Full payload:", JSON.stringify(payload, null, 2))

  if (action === "user_signed_up" && email) {
    await sendWelcome(email)
  } else if (action === "user_recovery_requested" && email) {
    await sendPasswordReset(email)
  }

  return new Response(null, { status: 204, headers: cors })
})

async function sendWelcome(email: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("RESEND_FROM_EMAIL")
  const brand = Deno.env.get("BRAND_NAME") || "UjjwalDeep"
  
  console.log("Attempting to send welcome email to:", email)
  console.log("API key exists:", !!apiKey)
  console.log("From email:", from)
  
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured")
    return
  }
  if (!from) {
    console.error("RESEND_FROM_EMAIL not configured")
    return
  }
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Welcome to ${brand}!`,
        html: `
          <h1>Welcome to ${brand}!</h1>
          <p>Thank you for signing up. We're excited to have you on board!</p>
          <p>You can now log in to your account and start exploring.</p>
        `
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error("Failed to send welcome email:", error)
    } else {
      console.log("Welcome email sent successfully to:", email)
    }
  } catch (err) {
    console.error("sendWelcome failed", err)
  }
}

async function sendPasswordReset(email: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("RESEND_FROM_EMAIL")
  const brand = Deno.env.get("BRAND_NAME") || "UjjwalDeep"
  
  console.log("Attempting to send password reset email to:", email)
  
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured for password reset")
    return
  }
  if (!from) {
    console.error("RESEND_FROM_EMAIL not configured for password reset")
    return
  }
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Reset your ${brand} password`,
        html: `
          <h1>Reset Your Password</h1>
          <p>You requested to reset your password for ${brand}.</p>
          <p>Please check your Supabase dashboard for the password reset link, as we're still setting up email delivery.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error("Failed to send password reset email:", error)
    } else {
      console.log("Password reset email sent successfully to:", email)
    }
  } catch (err) {
    console.error("sendPasswordReset failed", err)
  }
}
