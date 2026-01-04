import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role Key (Bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, updates, table, action = 'update', user_email } = body;

        // Table is always required. ID is required for update/delete but not create.
        if (!table) {
            return NextResponse.json({ error: "Missing table parameter" }, { status: 400 });
        }

        if (action !== 'create' && !id) {
            return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 });
        }

        // Explicitly allow only specific tables
        if (!['products', 'categories', 'venues', 'allergens', 'app_settings'].includes(table)) {
            return NextResponse.json({ error: "Invalid table" }, { status: 403 });
        }

        const resourceType = table === 'products' ? 'PRODUCT' :
            table === 'categories' ? 'CATEGORY' :
                table === 'venues' ? 'VENUE' :
                    table === 'allergens' ? 'ALLERGEN' :
                        table === 'app_settings' ? 'SETTINGS' : table.toUpperCase();

        let oldData = null;
        if (action === 'update' || action === 'delete') {
            let query = supabase.from(table).select('*');
            if (table === 'app_settings') {
                query = query.eq('key', id);
            } else {
                query = query.eq('id', id);
            }
            const { data } = await query.single();
            oldData = data;
        }

        let result;

        if (action === 'delete') {
            let query = supabase.from(table).delete();
            if (table === 'app_settings') {
                query = query.eq('key', id);
            } else {
                query = query.eq('id', id);
            }
            result = await query.select();

            // CLEANUP: If an allergen is deleted, remove it from all products
            if (!result.error && table === 'allergens' && oldData && oldData.name) {
                try {
                    // Find products containing this allergen
                    // Filtering text[] array containing a string
                    const { data: prods } = await supabase
                        .from('products')
                        .select('id, allergens')
                        .contains('allergens', [oldData.name]);

                    if (prods && prods.length > 0) {
                        for (const p of prods) {
                            if (Array.isArray(p.allergens)) {
                                const newAllergens = p.allergens.filter((a: string) => a !== oldData.name);
                                await supabase.from('products').update({ allergens: newAllergens }).eq('id', p.id);
                            }
                        }
                    }
                } catch (cleanupErr) {
                    console.error("Failed to clean up deleted allergen from products", cleanupErr);
                }
            }
        } else if (action === 'create') {
            if (!updates) return NextResponse.json({ error: "Missing data" }, { status: 400 });
            result = await supabase.from(table).insert(updates).select();
        } else {
            if (!updates) return NextResponse.json({ error: "Missing updates" }, { status: 400 });

            let query = supabase.from(table).update(updates);
            if (table === 'app_settings') {
                query = query.eq('key', id);
            } else {
                query = query.eq('id', id);
            }
            result = await query.select();
        }
        const { data, error } = result;

        if (error) {
            console.error(`${action.toUpperCase()} Error:`, error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // --- AUDIT LOGGING ---
        try {
            const resourceMap: any = { 'products': 'PRODUCT', 'categories': 'CATEGORY', 'venues': 'VENUE', 'allergens': 'ALLERGEN', 'app_settings': 'SETTINGS' };
            const resourceType = resourceMap[table] || table.toUpperCase();
            const actionType = action === 'create' ? `CREATE_${resourceType}` : action === 'delete' ? `DELETE_${resourceType}` : `UPDATE_${resourceType}`;

            let logDetails: any = {};

            // Helper for deep diff (Optimized for Partial Updates)
            const getDeepDiff = (oldObj: any, newObj: any) => {
                const changes: any = {};
                // Only iterate over keys present in the UPDATE payload (newObj)
                // We assume this is a PATCH operation, so missing keys mean "no change", not "delete".
                const keys = Object.keys(newObj || {});

                for (const key of keys) {
                    if (key === 'updated_at') continue;

                    const val1 = oldObj ? oldObj[key] : undefined;
                    const val2 = newObj[key]; // This is definitely present in updates

                    // Skip loose equality matches
                    if (JSON.stringify(val1) === JSON.stringify(val2)) continue;

                    if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null && !Array.isArray(val1) && !Array.isArray(val2)) {
                        const nested = getDeepDiff(val1, val2);
                        if (Object.keys(nested).length > 0) changes[key] = nested;
                    } else {
                        // Direct comparison
                        if (val1 !== val2) changes[key] = { from: val1, to: val2 };
                    }
                }
                return changes;
            };

            if (action === 'create') {
                logDetails = data && data[0] ? data[0] : updates;
            } else if (action === 'delete') {
                logDetails = oldData || { id };
            } else {
                // Update
                if (oldData) {
                    logDetails = {
                        id,
                        name: oldData.name || oldData.title,
                        changes: getDeepDiff(oldData, updates)
                    };



                    // ENRICHMENT: Resolve Foreign Key Names (e.g. Category ID -> Name)
                    // This creates a human-readable history directly in the log payload.
                    if (resourceType === 'PRODUCT') {
                        const catChange = logDetails.changes['category_id'] || logDetails.changes['categoryId'] || logDetails.changes['category'];
                        if (catChange && catChange.from && catChange.to) {
                            const { data: cats } = await supabase
                                .from('categories')
                                .select('id, name')
                                .in('id', [catChange.from, catChange.to]);

                            if (cats) {
                                logDetails.lookup = logDetails.lookup || {};
                                cats.forEach((c: any) => logDetails.lookup[c.id] = c.name);
                            }
                        }
                    }

                } else {
                    logDetails = { id, updates };
                }
            }

            // Enrich with User Email
            if (user_email) logDetails.user_email = user_email;

            // Enrich with Venue Name
            let venueIdToLookup = null;
            if (resourceType === 'VENUE') {
                venueIdToLookup = id || updates.id;
            } else {
                // For Products/Categories
                if (oldData && oldData.venue_id) venueIdToLookup = oldData.venue_id;
                else if (updates && (updates.venue_id || updates.venueId)) venueIdToLookup = updates.venue_id || updates.venueId;
            }

            if (venueIdToLookup && !logDetails.venue_name) {
                const { data: v } = await supabase.from('venues').select('name').eq('id', venueIdToLookup).single();
                if (v) logDetails.venue_name = v.name;
            }

            // Insert Log
            await supabase.from('audit_logs').insert({
                action_type: actionType,
                resource: table,
                details: logDetails,
                // user_email: 'api' // Optional, schema might default to something
            });

        } catch (logErr) {
            console.error("Audit Log Failed in API:", logErr);
            // Don't fail the request if logging fails, but log to console
        }
        // ---------------------

        return NextResponse.json({ data });

    } catch (err) {
        console.error("Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
