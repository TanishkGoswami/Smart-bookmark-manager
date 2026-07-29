import { test, expect } from '@playwright/test';

test.describe('Board Layout', () => {
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
});
