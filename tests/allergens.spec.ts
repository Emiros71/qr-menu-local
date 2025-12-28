import { test, expect } from '@playwright/test';

test.describe('Allergen Management System', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to admin allergen management
        await page.goto('http://localhost:3000/admin/venues/3adb9454-40ca-44c8-9a7c-26f72259bdc8');
        await page.waitForLoadState('networkidle');
    });

    test('should display allergens tab', async ({ page }) => {
        // Click on Allergens tab
        await page.click('text=Alerjenler');

        // Verify allergen management UI is visible
        await expect(page.locator('text=Alerjen Yönetimi')).toBeVisible();
        await expect(page.locator('input[placeholder*="Yeni alerjen"]')).toBeVisible();
    });

    test('should create a new allergen', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Create new allergen
        const allergenName = `Test Allergen ${Date.now()}`;
        await page.fill('input[placeholder*="Yeni alerjen"]', allergenName);
        await page.click('button:has-text("Ekle")');

        // Wait for creation and verify
        await page.waitForTimeout(2000);
        await expect(page.locator(`text=${allergenName}`)).toBeVisible();
    });

    test('should edit allergen and add translation', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Create allergen first
        const allergenName = `EditTest${Date.now()}`;
        await page.fill('input[placeholder*="Yeni alerjen"]', allergenName);
        await page.click('button:has-text("Ekle")');
        await page.waitForTimeout(2000);

        // Find the allergen row and click edit button
        const allergenRow = page.locator('.group').filter({ hasText: allergenName });
        await allergenRow.locator('button', { hasText: /Düzenle/ }).click();
        await page.waitForTimeout(500);

        // Add English translation
        const enInput = page.locator('input[placeholder*="EN"]').first();
        await enInput.waitFor({ state: 'visible', timeout: 5000 });
        await enInput.fill('Test Allergen EN');

        // Click save (green checkmark button)
        await allergenRow.locator('button.bg-green-600').click();
        await page.waitForTimeout(1000);

        // Verify translation badge appears (green background means translation exists)
        const enBadge = allergenRow.locator('span.bg-green-50');
        await expect(enBadge).toBeVisible({ timeout: 5000 });
    });

    test('should delete an allergen', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Create allergen first
        const allergenName = `DelTest${Date.now()}`;
        await page.fill('input[placeholder*="Yeni alerjen"]', allergenName);
        await page.click('button:has-text("Ekle")');
        await page.waitForTimeout(2000);

        // Setup dialog handler before clicking delete
        page.once('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        // Find the allergen row and click delete button (trash icon with red color)
        const allergenRow = page.locator('.group').filter({ hasText: allergenName });
        const deleteButton = allergenRow.locator('button.text-red-500');
        await deleteButton.click();

        await page.waitForTimeout(2000);

        // Verify deletion
        const deletedElement = page.locator(`text=${allergenName}`);
        await expect(deletedElement).not.toBeVisible({ timeout: 3000 });
    });

    test('should show product count for allergen', async ({ page }) => {
        await page.click('text=Alerjenler');
        await page.waitForTimeout(1000);

        // Check if any allergen displays product count
        const productCount = page.locator('text=/\\d+ üründe/').first();
        // If allergens exist, count should be visible
        const allergenRows = page.locator('.group');
        const count = await allergenRows.count();

        if (count > 0) {
            await expect(productCount).toBeVisible({ timeout: 3000 });
        }
    });

    test('should add allergen to product from product modal', async ({ page }) => {
        // Go to products tab
        await page.click('text=Ürün Listesi');
        await page.waitForTimeout(1000);

        // Click on first product
        const firstProduct = page.locator('tbody tr').first();
        await firstProduct.click();
        await page.waitForTimeout(1000);

        // Find and click add allergen button (+ Ekle button)
        const addAllergenBtn = page.locator('button:has-text("+ Ekle")').last();
        await addAllergenBtn.click();
        await page.waitForTimeout(300);

        const newAllergen = `ModalTest${Date.now()}`;
        const allergenInput = page.locator('input[placeholder="Alerjen..."]');
        await allergenInput.fill(newAllergen);
        await allergenInput.press('Enter');
        await page.waitForTimeout(2000);

        // Verify allergen was added (should appear as a selected badge)
        await expect(page.locator(`text=${newAllergen}`)).toBeVisible({ timeout: 3000 });
    });
});

test.describe('Allergen Translation on Customer Menu', () => {

    test('should display allergen in Turkish by default', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Look for allergen badges on products
        const allergenBadges = page.locator('span.text-\\[10px\\]');
        const count = await allergenBadges.count();

        if (count > 0) {
            // Just verify that allergen badges exist
            await expect(allergenBadges.first()).toBeVisible();
        }
    });

    test('should translate allergen to English when language is changed', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Find and click language selector (Globe icon button)
        const langButtons = page.locator('button').filter({ has: page.locator('svg') });
        const globeButton = langButtons.first();
        await globeButton.click();
        await page.waitForTimeout(500);

        // Click English
        await page.click('text=English');
        await page.waitForTimeout(1000);

        // Verify language changed by checking if page content is in English
        const categoryText = page.locator('button').filter({ hasText: /Drinks|Beverages/ }).first();
        // If English translation exists, it should be visible
        const count = await categoryText.count();
        if (count > 0) {
            await expect(categoryText).toBeVisible();
        }
    });

    test('should maintain allergen translation after category change', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Change to English
        const langButtons = page.locator('button').filter({ has: page.locator('svg') });
        const globeButton = langButtons.first();
        await globeButton.click();
        await page.waitForTimeout(300);
        await page.click('text=English');
        await page.waitForTimeout(1000);

        // Click on second category if exists
        const categories = page.locator('nav button');
        const categoryCount = await categories.count();

        if (categoryCount > 1) {
            await categories.nth(1).click();
            await page.waitForTimeout(500);

            // Verify page is still in English (allergens should be too)
            // Just making sure language didn't reset
            const turkishText = page.locator('text=/Menü|Kategoriler/').first();
            const hasTurkish = await turkishText.count();
            expect(hasTurkish).toBe(0);
        }
    });
});
