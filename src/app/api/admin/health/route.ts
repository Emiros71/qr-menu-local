import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseUrl } from '@/utils/supabase/config';
import { getAuthenticatedActor, isSuperAdmin } from '@/server/auth';

export const dynamic = 'force-dynamic';

const SERVICES_MAP = {
    VenueService: 'venues',
    CategoryService: 'categories',
    ProductService: 'products',
    AllergenService: 'allergens',
    SettingsService: 'app_settings'
};

export async function GET() {
    if (!isSuperAdmin(await getAuthenticatedActor())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = getServerSupabaseUrl();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({
            status: 'error',
            message: 'Supabase yapılandırması eksik.'
        }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const results = [];
    let allHealthy = true;

    for (const [serviceName, tableName] of Object.entries(SERVICES_MAP)) {
        const start = Date.now();
        try {
            const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
            const end = Date.now();
            const latencyMs = end - start;

            if (error) {
                allHealthy = false;
                results.push({
                    name: serviceName,
                    status: 'error',
                    latencyMs
                });
            } else {
                results.push({
                    name: serviceName,
                    status: 'online',
                    latencyMs
                });
            }
        } catch {
            allHealthy = false;
            const latencyMs = Date.now() - start;
            results.push({
                name: serviceName,
                status: 'error',
                latencyMs
            });
        }
    }

    return NextResponse.json({
        status: allHealthy ? 'healthy' : 'degraded',
        services: results,
        timestamp: new Date().toISOString()
    });
}
