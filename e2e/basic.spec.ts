// e2e/builder.spec.ts
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Pretend user is already authed: mock any session read if your app calls it.
  await page.route(/\/auth\/v1\/user/, r => r.fulfill({ status: 200, body: JSON.stringify({ user: { id: 'u1' } }) }))

  // Edge functions
  await page.route(/\/functions\/v1\/create-test/, r =>
    r.fulfill({ status: 200, body: JSON.stringify({ id: 't1', owner_id: 'u1' }) })
  )
  await page.route(/\/functions\/v1\/start-attempt/, r =>
    r.fulfill({ status: 200, body: JSON.stringify({ attempt: { id: 'a1', test_id: 't1' } }) })
  )
  await page.route(/\/functions\/v1\/get-attempt\/a1/, r =>
    r.fulfill({ status: 200, body: JSON.stringify({ attempt: { id: 'a1', test_id: 't1' }, items: [] }) })
  )

  // PostgREST reads that happen on test start/print
  await page.route(/\/rest\/v1\/questions/, r =>
    r.fulfill({ status: 200, body: '[]', headers: { 'content-type': 'application/json' } })
  )
  await page.route(/\/rest\/v1\/print_packages.*limit=1/, r =>
    r.fulfill({ status: 200, body: '[]', headers: { 'content-type': 'application/json' } })
  )
})

test('builder creates and starts a test (mocked)', async ({ page }) => {
  await page.goto('/#/app/builder')
  await page.getByRole('button', { name: /create test/i }).click()
  await expect(page.getByText(/test ready/i)).toBeVisible()
  await page.getByRole('button', { name: /start test now/i }).click()
  await expect(page).toHaveURL(/\/app\/test\/a1/)
})
