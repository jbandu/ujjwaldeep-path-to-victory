// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const RESEND_FROM     = Deno.env.get("RESEND_FROM_EMAIL")!
const OPENAI_API_KEY  = Deno.env.get("OPENAI_API_KEY")!
const MAPBOX_TOKEN    = Deno.env.get("MAPBOX_TOKEN")!
const OPENWEATHER_KEY = Deno.env.get("OPENWEATHER_KEY")!

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SendPayload = {
  user_id?: string;             // optional; else derive from token later
  email?: string;               // optional override
  exam_date_override?: string;  // ISO string, optional
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY || !OPENAI_API_KEY) {
      return json({ error: "Missing secrets" }, 500)
    }

    const payload: SendPayload = await req.json().catch(() => ({} as any))
    
    // Get user from auth header if no user_id provided
    let userId = payload.user_id
    if (!userId) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (userRes.ok) {
          const user = await userRes.json()
          userId = user.id
        }
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1) Load exam-day context
    let ctx = await selectExamContext(supabase, userId, payload.email)
    if (!ctx) return json({ error: "No profile context found" }, 400)

    if (payload.exam_date_override) ctx.exam_date = payload.exam_date_override

    // 2) Geocode if lat/lng missing
    const home = await ensureGeocode(ctx.home_address, ctx.home_lat, ctx.home_lng)
    const center = await ensureGeocode(ctx.exam_center_address, ctx.exam_lat, ctx.exam_lng)

    // 3) Weather for exam city or exam center coordinates
    const whenISO = ctx.exam_date
    const wx = await getWeather(center.lat, center.lng, whenISO)

    // 4) OpenAI: tailor advice + fun facts (context-aware)
    const advice = await aiAdvice({
      name: ctx.full_name,
      examISO: whenISO,
      subjects: ["Physics","Chemistry","Biology"], // you may compute real strengths later
      locationHint: ctx.exam_city || "",
      weather: wx?.summary,
    })

    // 5) Build email (crisp!)
    const subject = `Your NEET Exam Day Plan — ${shortDate(whenISO)}`
    const html = buildEmailHTML({
      name: ctx.full_name,
      examISO: whenISO,
      home,
      center,
      weather: wx,
      advice
    })

    // 6) Send with Resend
    const to = ctx.email
    const ok = await sendResend({ to, subject, html })
    if (!ok) return json({ error: "Resend failed" }, 500)

    // 7) Return helpful links used in email (useful for preview)
    return json({
      ok: true,
      to,
      subject,
      preview: { html },
      map_links: {
        to_center: mapLink(home.lat, home.lng, center.lat, center.lng),
      },
    })
  } catch (e) {
    console.error('Error in examday-email:', e)
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

// ---------- helpers ----------
async function selectExamContext(supabase: any, user_id?: string, email?: string) {
  try {
    let query = supabase.from('v_examday_context').select('*')
    
    if (user_id) {
      query = query.eq('user_id', user_id)
    } else if (email) {
      query = query.eq('email', email)
    } else {
      query = query.limit(1)
    }
    
    const { data, error } = await query.maybeSingle()
    
    if (error) {
      console.error('Error selecting exam context:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error selecting exam context:', error)
    return null
  }
}

async function ensureGeocode(address?: string, lat?: number, lng?: number) {
  if (lat != null && lng != null) return { lat, lng, address }
  if (!address || !MAPBOX_TOKEN) return { lat: lat ?? 0, lng: lng ?? 0, address }
  
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    const r = await fetch(url)
    const j = await r.json()
    const feat = j?.features?.[0]
    if (!feat) return { lat: lat ?? 0, lng: lng ?? 0, address }
    const [lng2, lat2] = feat.center
    return { lat: lat2, lng: lng2, address }
  } catch (error) {
    console.error('Geocoding error:', error)
    return { lat: lat ?? 0, lng: lng ?? 0, address }
  }
}

async function getWeather(lat: number, lng: number, iso?: string) {
  if (!OPENWEATHER_KEY || !lat || !lng) return null
  
  try {
    // 5-day / 3-hour forecast
    const r = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}&units=metric`)
    const j = await r.json()
    if (!iso || !j?.list?.length) return { summary: "Forecast unavailable", slot: null }
    
    const target = new Date(iso).getTime()
    // pick nearest 3h slot
    let best = j.list[0]
    let bestDiff = Math.abs(new Date(best.dt * 1000).getTime() - target)
    for (const it of j.list) {
      const diff = Math.abs(new Date(it.dt * 1000).getTime() - target)
      if (diff < bestDiff) { best = it; bestDiff = diff }
    }
    return {
      tempC: Math.round(best.main.temp),
      feelsC: Math.round(best.main.feels_like),
      desc: best.weather?.[0]?.description,
      wind: Math.round(best.wind?.speed ?? 0),
      pop: Math.round((best.pop ?? 0) * 100),
      at: new Date(best.dt * 1000).toISOString(),
      summary: `${Math.round(best.main.temp)}°C, ${best.weather?.[0]?.description}, rain ${Math.round((best.pop ?? 0)*100)}%`
    }
  } catch (error) {
    console.error('Weather error:', error)
    return { summary: "Weather unavailable", slot: null }
  }
}

function mapLink(hLat:number, hLng:number, eLat:number, eLng:number) {
  // Google Maps deep link works universally (or swap to Mapbox Directions URL)
  return `https://www.google.com/maps/dir/${hLat},${hLng}/${eLat},${eLng}`
}

async function aiAdvice(input: { name?: string; examISO?: string; subjects?: string[]; locationHint?: string; weather?: string }) {
  try {
    const sys = `You are a NEET mentor. Return strict JSON with keys: headline, plan, nutrition, sleep, logistics, mindset, fun_facts (array of 2), checklist (array of short items). Tone: calm, practical, encouraging.`
    const user = {
      student: { name: input.name, subjects: input.subjects },
      exam_time: input.examISO,
      weather: input.weather,
      city_hint: input.locationHint
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(user) }
        ],
        response_format: { type: "json_object" }
      })
    })
    const json = await res.json()
    return JSON.parse(json.choices?.[0]?.message?.content ?? "{}")
  } catch (error) {
    console.error('AI advice error:', error)
    return {}
  }
}

async function sendResend({ to, subject, html }: { to: string, subject: string, html: string }) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html
      })
    })
    return r.ok
  } catch (error) {
    console.error('Resend error:', error)
    return false
  }
}

function shortDate(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function buildEmailHTML({ name, examISO, home, center, weather, advice }:{
  name?: string,
  examISO?: string,
  home: any, center: any, weather: any,
  advice: any
}) {
  const when = shortDate(examISO)
  const route = mapLink(home.lat, home.lng, center.lat, center.lng)
  const wx = weather ? `${weather.tempC ?? ""}°C • ${weather.desc ?? ""} • Rain ${weather.pop ?? 0}%` : "N/A"
  const headline = advice?.headline ?? "Your Exam Day Game Plan"
  const checklist = (advice?.checklist ?? [
    "2 pens + 2 pencils + eraser",
    "Admit card + ID",
    "Water + light snack",
    "Leave 90 mins early"
  ]).map((t:string)=>`<li>${t}</li>`).join("")

  return `
  <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background-color:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1a365d;font-size:24px;margin:0;">UjjwalDeep</h1>
      <p style="color:#666;margin:8px 0 0 0;">Your NEET Success Partner</p>
    </div>
    
    <h2 style="color:#333;margin:0 0 16px 0;">Hi ${name || "there"},</h2>
    <p style="font-size:18px;font-weight:600;color:#1a365d;margin:0 0 24px 0;">${headline}</p>
    
    <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:24px 0;">
      <p style="margin:0 0 8px 0;"><strong>📅 Exam:</strong> ${when}</p>
      <p style="margin:0 0 8px 0;"><strong>🌤️ Weather @ Center:</strong> ${wx}</p>
      <p style="margin:0;"><a href="${route}" style="color:#2563eb;text-decoration:none;font-weight:500;">🗺️ Open directions →</a></p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">📋 Your Action Plan</h3>
      <p style="line-height:1.6;margin:0 0 16px 0;">${advice?.plan ?? "Arrive early, hydrate, and keep your pacing steady: ~60s/MCQ."}</p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">🥗 Nutrition Strategy</h3>
      <p style="line-height:1.6;margin:0 0 16px 0;">${advice?.nutrition ?? "Light breakfast 2–3 hrs before. Avoid heavy/oily foods. Keep water & a small snack."}</p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">😴 Sleep & Recovery</h3>
      <p style="line-height:1.6;margin:0 0 16px 0;">${advice?.sleep ?? "Aim for 7–8 hours. No new topics tonight—just quick formulas and confidence."}</p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">🚗 Logistics</h3>
      <p style="line-height:1.6;margin:0 0 16px 0;">${advice?.logistics ?? "Keep admit card & ID ready; leave with a 45–60 min buffer."}</p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">🧠 Mindset</h3>
      <p style="line-height:1.6;margin:0 0 16px 0;">${advice?.mindset ?? "If a question stalls you >60s, mark and move. You've got this."}</p>
    </div>

    <div style="margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">✅ Final Checklist</h3>
      <ul style="line-height:1.6;margin:0;padding-left:20px;">${checklist}</ul>
    </div>

    <div style="background:#e0f2fe;padding:20px;border-radius:8px;margin:32px 0;">
      <h3 style="color:#1a365d;margin:0 0 12px 0;">💡 Fun Facts to Boost Confidence</h3>
      <ul style="line-height:1.6;margin:0;padding-left:20px;">
        <li>${(advice?.fun_facts?.[0]) ?? "On exam day, listening to music at ~60–70 BPM can calm your heart rate."}</li>
        <li>${(advice?.fun_facts?.[1]) ?? "2–3 deep breaths lower cortisol and sharpen focus in under a minute."}</li>
      </ul>
    </div>

    <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px 0;color:#666;">All the best,</p>
      <p style="margin:0;font-weight:600;color:#1a365d;">The UjjwalDeep Team</p>
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