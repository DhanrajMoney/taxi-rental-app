import { test, expect } from '@playwright/test';

test.describe('Bookings Command Center Drawer & Expenses Tab', () => {
  test('should display all 5 tabs including Expenses and open expense modal', async ({ page }) => {
    // 1. Visit root and log in
    await page.goto('/');

    await page.fill('input[type="email"]', 'admin@ridedesk.test');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. Wait for navigation and click on Bookings tab in sidebar
    const bookingsNav = page.getByRole('button', { name: 'Bookings', exact: true });
    await expect(bookingsNav).toBeVisible({ timeout: 10000 });
    await bookingsNav.click();

    // 3. Wait for booking cards to render
    const firstBookingCard = page.locator('.bk-card').first();
    await expect(firstBookingCard).toBeVisible({ timeout: 10000 });

    // 4. Click the booking card to open right drawer
    await firstBookingCard.click();

    // 5. Drawer must be visible
    const drawer = page.locator('.booking-detail-panel.open');
    await expect(drawer).toBeVisible();

    // 6. Check that all 5 tabs exist and are visible
    const tabsBar = drawer.locator('.bk-tabs-bar');
    await expect(tabsBar).toBeVisible();

    const journeyTab = tabsBar.locator('button:has-text("Journey")');
    const passengerTab = tabsBar.locator('button:has-text("Passenger")');
    const fleetTab = tabsBar.locator('button:has-text("Fleet")');
    const billingTab = tabsBar.locator('button:has-text("Billing")');
    const expensesTab = tabsBar.locator('button:has-text("Expenses")');

    await expect(journeyTab).toBeVisible();
    await expect(passengerTab).toBeVisible();
    await expect(fleetTab).toBeVisible();
    await expect(billingTab).toBeVisible();
    await expect(expensesTab).toBeVisible();

    // 7. Click Expenses tab
    await expensesTab.click();

    // 8. Verify Expenses tab content
    await expect(drawer.locator('text=Trip Profit & Loss (P&L)')).toBeVisible();
    const logExpenseBtn = drawer.locator('button:has-text("Log Ride Expense")');
    await expect(logExpenseBtn).toBeVisible();

    // 9. Click "+ Log Ride Expense" and check modal opens
    await logExpenseBtn.click();
    const modal = page.locator('.exp-modal-shell');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Log Trip Operational Expense')).toBeVisible();

    // Close modal
    await modal.locator('.exp-modal-close').click();
    await expect(modal).not.toBeVisible();
  });
});
