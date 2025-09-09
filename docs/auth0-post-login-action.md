# Auth0 Post-Login Action for Supabase Provisioning

## Purpose

This Auth0 Post-Login Action runs **after a successful Auth0 login** and calls our app's provisioning API to upsert users into Supabase. The Action ensures that every authenticated user from Auth0 is automatically provisioned in our Supabase database.

## Setup Instructions

### 1. Add Secrets in Auth0

Navigate to **Auth0 → Actions → Library → (Your Action) → Settings → Secrets** and add:

- `PROVISIONING_URL` → `https://valayam.app/api/auth/provision` _(or your preview/local URL)_
- `PROVISIONING_SECRET` → same value as your app's `PROVISIONING_SECRET` env var

### 2. Post-Login Action Code

Create a new Action in **Auth0 → Actions → Library → Build Custom → Post-Login** and paste this code exactly:

```js
/**
 * Auth0 → Actions → Library → Build Custom → Post-Login
 * Add Secrets:
 *   PROVISIONING_URL        e.g., https://valayam.app/api/auth/provision
 *   PROVISIONING_SECRET     must match your app's PROVISIONING_SECRET
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
```

### 3. Attach the Action to Login Flow

1. Go to **Auth0 → Actions → Flows → Login**
2. Drag your newly created Action into the flow
3. Click **Apply** to save the changes

## App-side Requirements (Already Implemented)

The following components are already implemented in the codebase:

### API Endpoint
- **Location**: `supabase/functions/auth0-provision/index.ts`
- **Function**: 
  - Validates header `x-provisioning-secret`
  - Upserts `{ auth0_user_id, email, full_name }` into `public.users` table
  - Uses `onConflict: 'auth0_user_id'` for safe upserts

### Environment Variables
Required in your app environment (see `.env.example`):
- `PROVISIONING_SECRET` (must match Action secret)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Test Checklist

To verify the integration is working correctly:

1. ✅ Log in via `/login` → should be redirected back to `/dashboard`
2. ✅ In Auth0 **Monitoring → Logs**, verify your Action runs without errors
3. ✅ In Supabase `public.users` table, confirm a row exists with your `auth0_user_id` + `email`
4. ✅ (Optional) Rotate `PROVISIONING_SECRET` in both places to validate secret validation

## Troubleshooting

### 401 Error from Provisioning Endpoint
**Cause**: Secrets mismatch between Auth0 Action and app environment
**Solution**: Ensure `PROVISIONING_SECRET` values are identical in:
- Auth0 Action secrets
- App environment variables

### CORS or Callback Errors
**Cause**: Auth0 app configuration missing required URLs
**Solution**: In Auth0 app settings, include exact URLs for:
- Allowed Callback URLs
- Allowed Logout URLs  
- Allowed Web Origins
- Add Lovable preview origin if using preview environment

### No Row Created in Supabase
**Cause**: Multiple possible issues
**Solutions**:
- Check Auth0 Action logs in **Monitoring → Logs**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in app environment
- Confirm `public.users` table exists in Supabase
- Check Supabase Edge Function logs for errors

### Action Not Running
**Cause**: Action not properly attached to Login flow
**Solution**: 
- Verify Action is dragged into **Actions → Flows → Login**
- Ensure you clicked **Apply** after adding the Action
- Check Action is enabled and published

## Security Notes

- The provisioning endpoint is protected by a secret header validation
- Login is never blocked if provisioning fails (graceful degradation)
- Use HTTPS URLs for production environments
- Rotate secrets regularly for enhanced security