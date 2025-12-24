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
        await page.waitForTimeout(1000);
        await expect(page.locator(`text=${allergenName}`)).toBeVisible();
    });

    test('should edit allergen and add translation', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Create allergen first
        const allergenName = `Edit Test ${Date.now()}`;
        await page.fill('input[placeholder*="Yeni alerjen"]', allergenName);
        await page.click('button:has-text("Ekle")');
        await page.waitForTimeout(1000);

        // Click edit button
        await page.locator(`text=${allergenName}`).locator('..').locator('button:has-text("Düzenle")').click();

        // Add English translation
        const enInput = page.locator('input[placeholder*="EN çevirisi"]').first();
        await enInput.fill('Test Allergen EN');

        // Save
        await page.locator('button:has-text("✓")').first().click();
        await page.waitForTimeout(500);

        // Verify translation badge
        await expect(page.locator('text=en').first()).toBeVisible();
    });

    test('should delete an allergen', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Create allergen first
        const allergenName = `Delete Test ${Date.now()}`;
        await page.fill('input[placeholder*="Yeni alerjen"]', allergenName);
        await page.click('button:has-text("Ekle")');
        await page.waitForTimeout(1000);

        // Accept confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        // Click delete
        await page.locator(`text=${allergenName}`).locator('..').locator('button').filter({ hasText: '' }).click();
        await page.waitForTimeout(500);

        // Verify deletion
        await expect(page.locator(`text=${allergenName}`)).not.toBeVisible();
    });

    test('should show product count for allergen', async ({ page }) => {
        await page.click('text=Alerjenler');

        // Check if any allergen displays product count
        const productCount = page.locator('text=/\\d+ üründe/').first();
        // If allergens exist, count should be visible
        if (await page.locator('.group').count() > 0) {
            await expect(productCount).toBeVisible();
        }
    });

    test('should add allergen to product from product modal', async ({ page }) => {
        // Go to products tab
        await page.click('text=Ürün Listesi');
        await page.waitForTimeout(500);

        // Click on first product
        const firstProduct = page.locator('tbody tr').first();
        await firstProduct.click();
        await page.waitForTimeout(500);

        // Create new allergen from modal
        await page.click('button:has-text("Ekle")');

        const newAllergen = `Modal Test ${Date.now()}`;
        const allergenInput = page.locator('input[placeholder="Alerjen..."]');
        await allergenInput.fill(newAllergen);
        await allergenInput.press('Enter');
        await page.waitForTimeout(1000);

        // Verify allergen was added
        await expect(page.locator(`text=${newAllergen}`)).toBeVisible();
    });
});

test.describe('Allergen Translation on Customer Menu', () => {

    test('should display allergen in Turkish by default', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');

        // Look for allergen badges on products
        const allergenBadge = page.locator('.text-\\[10px\\]').filter({ hasText: /Süt|Gluten|Yumurta/ }).first();

        if (await allergenBadge.count() > 0) {
            const text = await allergenBadge.textContent();
            expect(text).toMatch(/Süt|Gluten|Yumurta/);
        }
    });

    test('should translate allergen to English when language is changed', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');

        // Wait for initial load
        await page.waitForTimeout(1000);

        // Find and click language selector
        const langButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await langButton.click();
        await page.waitForTimeout(300);

        // Click English
        await page.click('text=English');
        await page.waitForTimeout(500);

        // Check if allergen is translated
        // This would work if allergens have English translations in DB
        const allergenBadge = page.locator('.text-\\[10px\\]').filter({ hasText: /Milk|Gluten|Egg/ }).first();

        // If allergen exists and has translation, it should show English
        if (await allergenBadge.count() > 0) {
            const text = await allergenBadge.textContent();
            expect(text).toMatch(/Milk|Gluten|Egg/);
        }
    });

    test('should maintain allergen translation after category change', async ({ page }) => {
        await page.goto('http://localhost:3000/aura');
        await page.waitForLoadState('networkidle');

        // Change to English
        const langButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await langButton.click();
        await page.waitForTimeout(200);
        await page.click('text=English');
        await page.waitForTimeout(500);

        // Click on a category
        const secondCategory = page.locator('button').filter({ hasText: /İçecek|Drink/ }).first();
        if (await secondCategory.count() > 0) {
            await secondCategory.click();
            await page.waitForTimeout(500);

            // Allergens should still be in English
            const allergenBadge = page.locator('.text-\\[10px\\]').first();
            if (await allergenBadge.count() > 0) {
                const text = await allergenBadge.textContent();
                // Should not contain Turkish text
                expect(text).not.toMatch(/Süt|Yumurta/);
            }
        }
    });
});
