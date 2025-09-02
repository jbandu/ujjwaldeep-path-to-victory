// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const FROM = Deno.env.get("RESEND_FROM_EMAIL")!
const BRAND = Deno.env.get("BRAND_NAME") ?? "UjjwalDeep"
const COLOR = Deno.env.get("BRAND_PRIMARY") ?? "#F59E0B"
const HOOK_SECRET = Deno.env.get("HOOK_SECRET")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Welcome email function triggered')

    // Verify hook secret if configured
    if (HOOK_SECRET) {
      const key = req.headers.get("x-hook-secret")
      if (key !== HOOK_SECRET) {
        console.error('Unauthorized: Invalid hook secret')
        return json({ error: "Unauthorized" }, 401)
      }
    }

    if (!RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY')
      return json({ error: "Missing Resend API key" }, 500)
    }

    // Supabase Auth hook sends a JSON body with user info
    // Typical shape: { type: "USER_SIGNUP", record: { id, email, ... } }
    const evt = await req.json()
    console.log('Received webhook event:', JSON.stringify(evt, null, 2))

    const email = evt?.record?.email as string | undefined
    const userId = evt?.record?.id as string | undefined

    if (!email) {
      console.error('No email in hook payload:', evt)
      return json({ error: "No email in hook payload" }, 400)
    }

    console.log(`Sending welcome email to: ${email}`)

    const subject = `Welcome to ${BRAND} — Let's ace your exams! 🎯`
    const html = emailHTML({ brand: BRAND, color: COLOR, email, userId })

    const ok = await sendResend({ to: email, subject, html })
    if (!ok) {
      console.error('Failed to send email via Resend')
      return json({ error: "Resend failed" }, 500)
    }

    console.log(`Welcome email sent successfully to ${email}`)
    return json({ ok: true, email })
  } catch (e) {
    console.error('Error in welcome-email function:', e)
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

async function sendResend({ to, subject, html }:{ to:string; subject:string; html:string }) {
  try {
    console.log(`Sending email via Resend to: ${to}`)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html
      })
    })

    const responseData = await r.text()
    console.log(`Resend response (${r.status}):`, responseData)
    
    return r.ok
  } catch (error) {
    console.error('Resend API error:', error)
    return false
  }
}

function emailHTML({ brand, color, email, userId }:{ brand:string; color:string; email:string; userId?:string }) {
  // Get the app URL from environment or use fallback
  const appUrl = Deno.env.get("SITE_URL") || "https://ujjwaldeep-path-to-victory.lovable.app"
  
  return `
  <div style="font-family:Inter,system-ui,'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background-color:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:12px 20px;border-radius:12px;background:${color};color:#fff;font-weight:600;font-size:18px;">
        ${brand}
      </div>
      <p style="color:#666;margin:8px 0 0 0;font-size:14px;">Your NEET Success Partner</p>
    </div>
    
    <h2 style="color:#333;margin:0 0 16px 0;font-size:24px;">Welcome aboard! 👋</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 24px 0;font-size:16px;">
      We're thrilled to have you join our community of ambitious NEET aspirants. 
      Your journey to exam mastery starts right now!
    </p>

    <div style="background:#f8f9fa;padding:24px;border-radius:12px;margin:24px 0;">
      <h3 style="color:#333;margin:0 0 16px 0;font-size:18px;">🚀 What you can do next:</h3>
      <ul style="line-height:1.8;margin:0;padding-left:20px;color:#555;">
        <li><strong>Build your first test</strong> — Mix Physics, Chemistry & Biology questions</li>
        <li><strong>Try Print Mode</strong> — Generate NEET-style PDFs with OMR auto-grading</li>
        <li><strong>Set up Exam Day</strong> — Get personalized emails with weather & travel tips</li>
        <li><strong>Track your progress</strong> — Climb leaderboards and maintain your streak</li>
        <li><strong>Get AI help</strong> — Instant explanations and study strategies</li>
      </ul>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/app/dashboard"
         style="background:${color};color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(245,158,11,0.3);">
        Open Your Dashboard →
      </a>
    </div>

    <div style="background:#e0f2fe;padding:20px;border-radius:8px;margin:32px 0;">
      <h4 style="color:#1a365d;margin:0 0 8px 0;font-size:16px;">💡 Pro Tip</h4>
      <p style="color:#555;margin:0;font-size:14px;line-height:1.5;">
        Start with a 30-question mixed practice test to get familiar with the platform. 
        Our AI will analyze your performance and suggest focus areas!
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
    
    <p style="font-size:12px;color:#666;margin:16px 0 8px 0;">
      You're signed in as <strong>${email}</strong>
    </p>
    <p style="font-size:12px;color:#666;margin:0 0 24px 0;">
      If this wasn't you, please ignore this email or contact our support team.
    </p>

    <div style="text-align:center;margin-top:32px;">
      <p style="margin:0 0 8px 0;color:#666;font-size:14px;">Ready to excel?</p>
      <p style="margin:0;font-weight:600;color:#1a365d;font-size:16px;">The ${brand} Team</p>
    </div>
  </div>`
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders
    } 
  })
}