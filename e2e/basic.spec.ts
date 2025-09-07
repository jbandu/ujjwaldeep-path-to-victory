import { test, expect } from '@playwright/test'

test('home page has expected title', async ({ page }) => {
  await page.goto('/')          // ← works now because baseURL is set
  await expect(page).toHaveTitle(/UjjwalDeep/)
})
