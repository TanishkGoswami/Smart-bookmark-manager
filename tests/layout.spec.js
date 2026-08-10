import { test, expect } from '@playwright/test';

test.describe('Board Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
  });

  test('board canvas fills the viewport without page scrollbars', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const container = page.getByTestId('board-canvas');
    await expect(container).toBeVisible();

    await expect(page.getByTestId('board-card').first()).toBeVisible();

    const pageSize = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
    expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.viewportWidth);
    expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.viewportHeight);
  });

  test('theme studio previews and saves a preset', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await page.locator('button[title="Settings"]').click();
    await page.getByTestId('settings-theme-tab').click();
    await page.getByTestId('theme-preset-mono-dot').click();

    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#111827');

    await page.getByTestId('save-theme').click();
    await page.reload();

    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('visualTheme')).id)).toBe('mono-dot');
  });
});
