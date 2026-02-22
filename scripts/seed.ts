
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { venues } = require('../src/data/db'); // Note: This import works if db.ts is transpilable or if we run with ts-node/tsx

// Initialize Supabase Client (Service Role needed for RLS bypass during seed)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log("🌱 Seeding database...");

    // IDs Mapping (Mock ID -> Real UUID)
    const venueIdMap: Record<string, string> = {};
    const categoryIdMap: Record<string, string> = {};

    for (const ven of venues) {
        console.log(`Processing Venue: ${ven.name}`);

        // 1. Insert Venue
        const { data: vData, error: vError } = await supabase
            .from('venues')
            .insert({
                slug: ven.slug,
                name: ven.name,
                description: ven.description,
                cover_image: ven.coverImage,
                theme: ven.theme,
                // We let Postgres generate the ID, or we can force one if needed.
                // Let's let Postgres generate it to be cleaner with UUIDs.
            })
            .select()
            .single();

        if (vError) {
            console.error(`Error inserting venue ${ven.name}:`, vError.message);
            continue;
        }

        venueIdMap[ven.id] = vData.id;
        const realVenueId = vData.id;

        // 2. Insert Categories
        for (const cat of ven.categories) {
            const { data: cData, error: cError } = await supabase
                .from('categories')
                .insert({
                    venue_id: realVenueId,
                    name: cat.name,
                    image: cat.image,
                    order_index: 0
                })
                .select()
                .single();

            if (cError) {
                console.error(`Error inserting category ${cat.name}:`, cError.message);
                continue;
            }

            categoryIdMap[cat.id] = cData.id;
        }

        // 3. Insert Products
        // We need to loop products and match them to the NEW category ID
        // The current mock structure has products flat in venue but with categoryId link
        for (const prod of ven.products) {
            const realCategoryId = categoryIdMap[prod.categoryId];

            if (!realCategoryId) {
                console.warn(`Skipping product ${prod.name} because category ${prod.categoryId} wasn't found.`);
                continue;
            }

            const { error: pError } = await supabase
                .from('products')
                .insert({
                    venue_id: realVenueId,
                    category_id: realCategoryId,
                    name: prod.name,
                    description: prod.description,
                    price: prod.price,
                    currency: prod.currency,
                    image: prod.image,
                    labels: prod.labels || [],
                    is_available: prod.isAvailable
                });

            if (pError) {
                console.error(`Error inserting product ${prod.name}:`, pError.message);
            }
        }
    }

    console.log("✅ Seed completed!");
}

seed().catch(console.error);
