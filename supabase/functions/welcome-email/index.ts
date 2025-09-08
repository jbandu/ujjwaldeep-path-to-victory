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

  if (!bearerOk && !hmacOk) {
    console.warn("Auth hook: missing or invalid authorization; skipping side-effects")
    return new Response(null, { status: 204, headers: cors })
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
  const email = payload?.auth_event?.user?.email as string | undefined
  console.log("Auth hook action:", action)

  if (action === "user_signed_up" && email) {
    await sendWelcome(email)
  }

  switch (action) {
    case "user_signed_up":
    case "user_repeated_signup":
    case "user_recovery_requested":
      return new Response(null, { status: 204, headers: cors })
    default:
      return new Response(null, { status: 204, headers: cors })
  }
})

async function sendWelcome(email: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("RESEND_FROM_EMAIL")
  const brand = Deno.env.get("BRAND_NAME") || "UjjwalDeep"
  if (!apiKey || !from) return
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Welcome to ${brand}!`,
        html: `<p>Welcome to ${brand}!</p>`
      }),
    })
  } catch (err) {
    console.error("sendWelcome failed", err)
  }
}
