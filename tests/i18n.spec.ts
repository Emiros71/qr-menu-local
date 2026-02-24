
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe.serial('i18n Functionality Tests', () => {
    let VENUE_ID: string;
    let VENUE_SLUG: string;

    // Setup: Create a venue with bilingual support
    test.beforeAll(async () => {
        const timestamp = Date.now();
        VENUE_SLUG = `i18n-venue-${timestamp}`;

        const { data, error } = await supabase.from('venues').insert({
            name: `i18n Test Venue ${timestamp}`,
            slug: VENUE_SLUG,
            supported_languages: ['tr', 'en'],
            default_language: 'tr',
            theme: { primary: "#000000", secondary: "#ffffff" }
        }).select();

        if (error) {
            console.error('Supabase Setup Error:', error);
        }
        expect(error).toBeNull();
        VENUE_ID = data![0].id;
        console.log(`Created i18n Venue: ${VENUE_ID}`);
    });

    test('Admin should be able to add category translations via Modal', async ({ page }) => {
        if (!VENUE_ID) test.skip();
        await page.goto(`/admin/venues/${VENUE_ID}`);

        // 1. Go to Categories Tab
        await page.getByRole('button', { name: 'Kategoriler' }).click();

        // 2. Click "Yeni Kategori" (The big dashed button)
        await page.getByText('Yeni Kategori').click();

        // 3. Modal should appear
        const modal = page.locator('.fixed.inset-0').last(); // Might be multiple if nested, but last one usually
        await expect(modal).toBeVisible();
        await expect(modal.getByText('Yeni Kategori')).toBeVisible();

        // 4. Fill General Info (Turkish Name)
        await modal.getByPlaceholder('Örn: Ana Yemekler').fill('Ana Yemekler TR');

        // 5. Switch to Translations Tab
        await modal.getByRole('button', { name: 'Çeviriler' }).click();

        // 6. Fill English Translation
        // Look for input with placeholder like "EN çevirisi..."
        const enInput = modal.getByPlaceholder('EN çevirisi...');
        await expect(enInput).toBeVisible();
        await enInput.fill('Main Course EN');

        // 7. Save
        await modal.getByRole('button', { name: 'Kaydet' }).click();

        // 8. Verify Category Card appears
        await expect(page.getByText('Ana Yemekler TR')).toBeVisible();
    });

    test('Customer Menu should show Language Selector and switch languages', async ({ page }) => {
        if (!VENUE_SLUG) test.skip();
        await page.goto(`/${VENUE_SLUG}`);

        // 1. Check Globe Icon in Sticky Header
        // It resides in a button with a Globe icon
        const globeBtn = page.locator('header button:has(.lucide-globe)');
        await expect(globeBtn).toBeVisible();

        // 2. Click Globe Icon -> Open Menu
        await globeBtn.click();

        // 3. Verify Menu Options
        const trOption = page.locator('button', { hasText: 'Türkçe' });
        const enOption = page.locator('button', { hasText: 'English' });
        await expect(enOption).toBeVisible();

        // FORCE TR first (in case browser auto-detected EN)
        await trOption.click();
        // Wait for switch
        await expect(globeBtn).toContainText('TR');

        // 4. Verify Category is Turkish "Ana Yemekler TR"
        await expect(page.getByText('Ana Yemekler TR')).toBeVisible();

        // 5. Open Menu again and Click English
        await globeBtn.click();
        await enOption.click();

        // 6. Verify Category changes to "Main Course EN"
        await expect(page.getByText('Main Course EN')).toBeVisible();

        // 7. Verify Globe Badge changed to 'EN'
        await expect(globeBtn).toContainText('EN');
    });

    test.afterAll(async () => {
        if (VENUE_ID) {
            await supabase.from('venues').delete().eq('id', VENUE_ID);
        }
    });
});
