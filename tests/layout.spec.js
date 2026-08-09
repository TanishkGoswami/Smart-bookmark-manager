import { test, expect } from '@playwright/test';

test.describe('Board Layout', () => {
  test('mock boards render in adjacent desktop columns', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const container = page.getByTestId('board-layout');
    await expect(container).toBeVisible();

    const boards = page.getByTestId('bookmark-board');
    await expect(boards).toHaveCount(2);
    await expect(page.getByText('Bookmarks Bar')).toBeVisible();
    await expect(page.getByText('Sites')).toBeVisible();

    const firstColBox = await boards.nth(0).boundingBox();
    const secondColBox = await boards.nth(1).boundingBox();

    expect(firstColBox).not.toBeNull();
    expect(secondColBox).not.toBeNull();
    expect(secondColBox.x).toBeGreaterThan(firstColBox.x);
    expect(secondColBox.y).toBeCloseTo(firstColBox.y, -1);
  });
});
