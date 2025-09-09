# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a81589cd-6203-42d4-8fd8-66f5391223ec

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a81589cd-6203-42d4-8fd8-66f5391223ec) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a81589cd-6203-42d4-8fd8-66f5391223ec) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Auth0 Integration

### Auth0 Provisioning Endpoint

The project includes an Auth0 provisioning endpoint at `/functions/v1/auth0-provision` that is called by an **Auth0 Post-Login Action**. This endpoint automatically creates or updates user records in the Supabase database when users authenticate through Auth0.

**Required Environment Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `PROVISIONING_SECRET` - Secret key passed in the `x-provisioning-secret` header for authentication

The Auth0 Post-Login Action should make a POST request to this endpoint with:
```json
{
  "auth0_user_id": "auth0|user_id",
  "email": "user@example.com",
  "full_name": "User Name"
}
```

## Premium subscriptions

This project includes basic premium subscription support using Razorpay and Supabase.

### Environment variables

Set the following server-side variables:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Public variables:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `NEXT_PUBLIC_INR_PRICE` (e.g. `999`)

### Webhooks

Configure the Razorpay dashboard to send webhooks to `/api/billing/webhook`. The endpoint verifies the signature and updates `payments`, `user_subscriptions` and `invoices` tables.

## Supabase Auth Hooks

The project uses a Supabase Auth Hook to trigger the `welcome-email` edge function for signup and recovery events. To enable it:

1. In **Supabase Dashboard → Project Settings → Functions → Secrets**, add the secret used to authenticate the hook:

   ```
   AUTH_HOOK_SECRET=<random-string>
   ```

   (Optional) add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` if you want the function to send transactional emails.

2. In **Auth → Auth Hooks (BETA)** create a hook with:

   - URL: `https://orxjqiegmocarwdedkpu.supabase.co/functions/v1/welcome-email`
   - Header: `Authorization: Bearer ${AUTH_HOOK_SECRET}`

3. The edge function validates the token or `x-supabase-signature` and returns `204` for `user_signed_up`, `user_repeated_signup` and `user_recovery_requested` events. Unauthorized or invalid requests receive a `401` JSON response.

These quick responses ensure that magic link and recovery emails are not blocked by hook failures.
