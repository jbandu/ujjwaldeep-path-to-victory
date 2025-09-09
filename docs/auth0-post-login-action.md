# Auth0 Post-Login Action → Supabase Provisioning

## Overview
After a successful Auth0 login, this Action calls our **Supabase Edge Function** to upsert the user into our database.

- **Endpoint:** `https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/auth0-provision`
- **Method:** `POST`
- **Headers:**  
  - `Content-Type: application/json`  
  - `x-provisioning-secret: <PROVISIONING_SECRET>` (shared secret)

## Secrets to add in Auth0 (Actions → Library → your Action → Settings → Secrets)
- `PROVISIONING_URL` = `https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/auth0-provision`
- `PROVISIONING_SECRET` = same value configured in the Edge Function env (and in our app envs)

## Post-Login Action Code
```js
/**
 * Auth0 → Actions → Library → Build Custom → Post-Login
 * Add Secrets:
 *   PROVISIONING_URL        e.g., https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/auth0-provision
 *   PROVISIONING_SECRET     must match your Edge Function/app secret
 */
exports.onExecutePostLogin = async (event, api) => {
  const url = event.secrets.PROVISIONING_URL;
  const secret = event.secrets.PROVISIONING_SECRET;

  const payload = {
    auth0_user_id: event.user.user_id,
    email: event.user.email,
    full_name: event.user.name || null
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provisioning-secret': secret
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Do not block login on provisioning failure
    console.log('Provisioning failed:', e.message);
  }
};
