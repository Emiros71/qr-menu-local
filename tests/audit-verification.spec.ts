
import { test, expect } from '@playwright/test';

test.describe.serial('Audit Logging Verification', () => {
    let VENUE_ID: string;
    let PRODUCT_ID: string;

    test('1. Create Venue (Should Log CREATE_VENUE)', async ({ request }) => {
        const response = await request.post('/api/admin/update', {
            data: {
                table: 'venues',
                action: 'create',
                updates: {
                    name: 'Log Verification Venue ' + Date.now(),
                    slug: 'log-verify-' + Date.now(),
                    supported_languages: ['tr', 'en']
                }
            }
        });
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        VENUE_ID = json.data[0].id;
        console.log('Venue Created:', VENUE_ID);
    });

    test('2. Create Product (Should Log CREATE_PRODUCT)', async ({ request }) => {
        const response = await request.post('/api/admin/update', {
            data: {
                table: 'products',
                action: 'create',
                updates: {
                    venue_id: VENUE_ID, // Use snake_case for direct API usage
                    name: 'Test Log Product',
                    price: 50,
                    is_available: true
                }
            }
        });
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        PRODUCT_ID = json.data[0].id;
        console.log('Product Created:', PRODUCT_ID);
    });

    test('3. Update Product with Nested Translations (Should Log UPDATE_PRODUCT with Deep Diff)', async ({ request }) => {
        const response = await request.post('/api/admin/update', {
            data: {
                table: 'products',
                action: 'update',
                id: PRODUCT_ID,
                updates: {
                    name: 'Test Log Product V2',
                    price: 75.5,
                    translations: {
                        en: { name: 'Test Product EN', description: 'English Description' },
                        de: { name: 'Test Produkt DE' }
                    }
                }
            }
        });
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        console.log('Product Updated:', json.data);
    });
});
