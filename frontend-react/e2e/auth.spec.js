import { test, expect } from '@playwright/test';

test.describe('Authentication and Landing Page', () => {
  test('should display login screen when unauthenticated', async ({ page }) => {
    await page.goto('/');

    // Check title heading
    await expect(page.locator('h1')).toContainText('Rent A Ride Desk');
    await expect(page.locator('text=Sign in to manage taxis and drivers.')).toBeVisible();

    // Check form fields
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should toggle to forgot password view', async ({ page }) => {
    await page.goto('/');

    // Click forgot password button
    const forgotBtn = page.locator('button:has-text("Forgot password?")');
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // Verify forgot password state
    await expect(page.locator('text=Enter your email and we will send you a reset link.')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Send reset link');
  });
});

