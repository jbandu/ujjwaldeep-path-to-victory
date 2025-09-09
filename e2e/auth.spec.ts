// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock Supabase endpoints used by auth helpers.
  await page.route(/\/auth\/v1\/token/, r =>
    r.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake', token_type: 'bearer',
      refresh_token: 'fake', user: { id: 'test-user' }, expires_in: 3600 }) })
  )
  await page.route(/\/auth\/v1\/recover/, r =>
    r.fulfill({ status: 200, body: '{}' }) // reset password succeeds
  )
})

test('login screen renders + actions exist', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
})

test('forgot password flow shows success without real email', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /forgot password/i }).click()
  await page.getByLabel(/email/i).fill('test@example.com')
  await page.getByRole('button', { name: /send reset link/i }).click()
  // Look for a stable phrase already in your code
  await expect(page.getByText(/password reset link/i)).toBeVisible({ timeout: 10000 })
})
