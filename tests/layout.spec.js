import { test, expect } from '@playwright/test';

test.describe('Board Layout', () => {
  test('boards are laid out horizontally without wrapping', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the Droppable container (the board container)
    // The container has 'all-columns' data attribute in dnd? Actually we can select by class
    const container = page.locator('.flex-1.overflow-x-auto');
    await expect(container).toBeVisible();

    // In mock data, there are two columns initially: 'Bookmarks Bar' and 'Sites'
    const columns = page.locator('.w-\\[300px\\]:not(button)');
    
    // Wait for columns to render
    await expect(columns.first()).toBeVisible();
    
    // Get the bounding boxes of the first and second columns
    const firstColBox = await columns.nth(0).boundingBox();
    const secondColBox = await columns.nth(1).boundingBox();
    
    expect(firstColBox).not.toBeNull();
    expect(secondColBox).not.toBeNull();

    // The second column should be to the right of the first column
    expect(secondColBox.x).toBeGreaterThan(firstColBox.x);
    
    // They should have the same roughly vertical position (y coordinate)
    expect(secondColBox.y).toBeCloseTo(firstColBox.y, -1); // tolerance of 10px

    // Verify 'flex-nowrap' is in the class list of the container
    await expect(container).toHaveClass(/flex-nowrap/);
  });
});
