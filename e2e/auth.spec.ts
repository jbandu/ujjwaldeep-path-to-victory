import { test, expect } from '@playwright/test'

// Helper to fill email and submit
async function submitEmail(page, email) {
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Continue' }).click()
}

test.describe('email auth flow', () => {
  test('shows success screen after submitting email', async ({ page }) => {
    // Intercept the OTP request to Supabase and return success
    await page.route('**/auth/v1/otp', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    await page.goto('/#/auth')
    await submitEmail(page, 'test@example.com')

    await expect(page.getByText('Check your email')).toBeVisible()
    await expect(page.getByText("test@example.com")).toBeVisible()
  })

  test('handles repeated signup by resending link', async ({ page }) => {
    await page.route('**/auth/v1/otp', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error_description: 'repeated signup', error: 'repeated signup' }),
      })
    )
    await page.route('**/auth/v1/resend', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    await page.goto('/#/auth')
    await submitEmail(page, 'test@example.com')

    await expect(page.getByText('Account exists')).toBeVisible()
    await expect(page.getByText('magic link')).toBeVisible()
  })
})

test('sign in with Google initiates OAuth flow', async ({ page }) => {
  await page.route('**/auth/v1/authorize**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' })
  )

  await page.goto('/#/auth')

  const [request] = await Promise.all([
    page.waitForRequest('**/auth/v1/authorize**'),
    page.getByRole('button', { name: 'Continue with Google' }).click(),
  ])

  expect(request.url()).toContain('provider=google')
})

