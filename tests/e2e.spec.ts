import { test, expect } from '@playwright/test';

test.describe.serial('QR Menu SaaS E2E Tests', () => {
    let VENUE_ID: string;
    let VENUE_SLUG: string;

    // Setup: Create a fresh venue for testing
    test.beforeAll(async ({ request }) => {
        const timestamp = Date.now();
        VENUE_SLUG = `e2e-venue-${timestamp}`;

        const response = await request.post('/api/admin/update', {
            data: {
                table: 'venues',
                action: 'create',
                updates: {
                    name: `E2E Test Venue ${timestamp}`,
                    slug: VENUE_SLUG,
                    theme: { primary: "#000000", secondary: "#ffffff", background: "#ffffff", foreground: "#000000" }
                }
            }
        });

        const json = await response.json();
        expect(response.ok()).toBeTruthy();
        VENUE_ID = json.data[0].id;
        console.log(`Created E2E Venue: ${VENUE_ID} (${VENUE_SLUG})`);
    });

    const TEST_CAT_NAME = 'E2E Test Kategori';
    const TEST_PROD_NAME = 'E2E Test Burger';

    // 1. Landing Page Test
    test('Landing page should load and display venues', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/SaaS/i);
        const venueLink = page.locator('a[href^="/"]');
        await expect(venueLink.first()).toBeVisible();
    });

    // 2. Customer Menu Flow
    test('Customer should be able to view the new venue menu', async ({ page }) => {
        if (!VENUE_SLUG) test.skip();
        await page.goto(`/${VENUE_SLUG}`);

        // It should be empty but page load should succeed
        const venueName = page.locator('h1');
        await expect(venueName).toContainText(/E2E Test Venue/i);
    });

    // 3. Admin Panel - Venue Editor UI Interactions
    test('Admin should be able to manage categories and products via UI', async ({ page }) => {
        if (!VENUE_ID) test.skip();

        // Go to Admin Venue Page
        await page.goto(`/admin/venues/${VENUE_ID}`);

        // Wait for page to load data (name should appear)
        await expect(page.locator('h1')).toContainText(/E2E Test Venue/i);

        // --- A. Create Category ---
        await page.getByRole('tab', { name: 'Kategoriler' }).click();
        const catInput = page.getByPlaceholder('Yeni Kategori Adı');
        await expect(catInput).toBeVisible();
        await catInput.fill(TEST_CAT_NAME);
        await page.getByRole('button', { name: 'Ekle' }).click();
        await expect(page.getByText(TEST_CAT_NAME)).toBeVisible();

        // --- B. Create Product ---
        await page.getByRole('tab', { name: 'Ürünler' }).click();
        const newProductBtn = page.getByRole('button', { name: 'Yeni Ürün' });
        await expect(newProductBtn).toBeVisible();
        await newProductBtn.click();

        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible();

        await modal.getByPlaceholder('Örn: Cheeseburger').fill(TEST_PROD_NAME);
        await modal.locator('input[type="number"]').fill('150');
        await modal.getByRole('button', { name: 'Kaydet' }).click();

        await expect(modal).toBeHidden();
        await expect(page.getByText(TEST_PROD_NAME)).toBeVisible();
    });

    // Cleanup via API
    test.afterAll(async ({ request }) => {
        if (VENUE_ID) {
            console.log('Cleaning up venue...');
            await request.post('/api/admin/update', {
                data: {
                    table: 'venues',
                    action: 'delete',
                    id: VENUE_ID
                }
            });
        }
    });

});
