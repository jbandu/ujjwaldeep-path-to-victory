# AGENTS.md

## Project
UjjwalDeep – Vite + React + TS + Tailwind (shadcn). Router: **HashRouter**.
Deploys: Lovable and GitHub Pages (subpath).

## Golden rules
- **Routing:** Use `HashRouter`. Keep path-based `/auth/callback` for Supabase; all app routes are hash (`/#/…`).  
- **Base path:** `vite.config.ts` → `base: './'`. Don’t change for GH Pages.
- **Auth:** Supabase PKCE + magic links. Always set `redirectTo/emailRedirectTo` to `/auth/callback`.  
- **Callback:** Handle both OAuth `?code=` and magic link `#access_token=`; then navigate to `next`.
- **RLS / DB:** Assume RLS is ON. Never bypass with service-key in client.  
  - `questions`: public read for `status='active'` (no PII).  
  - `tests`: `owner_id = auth.uid()` for insert/select/update.  
  - `attempts`: `user_id = auth.uid()` for insert/select/update.  
  - `print_packages`: readable by test owner.  
  - `profiles`: row per user, auto-created by trigger.

## Environments
- **Public:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase Auth settings (dashboard):**
  - Site URL: `https://ujjwaldeep-path-to-victory.lovable.app/`
  - Redirects (allow list):  
    - `https://ujjwaldeep-path-to-victory.lovable.app/`  
    - `https://ujjwaldeep-path-to-victory.lovable.app/auth/callback`  
    - `https://jbandu.github.io/ujjwaldeep-path-to-victory/`  
    - `https://jbandu.github.io/ujjwaldeep-path-to-victory/auth/callback`  
    - `http://localhost:8080/`  
    - `http://localhost:8080/auth/callback`
- **Email:** SMTP (Resend/SES/etc) configured; templates use the Site URL.

## Edge functions (Deno)
- Always forward JWT:
  ```ts
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });

##Totally optional—but adding this makes Codex faster, safer, and more consistent with your rules.
::contentReference[oaicite:0]{index=0}
