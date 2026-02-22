import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Servislerin eriştiği ana tablolar
const SERVICES_MAP = {
    VenueService: 'venues',
    CategoryService: 'categories',
    ProductService: 'products',
    AllergenService: 'allergens',
    SettingsService: 'app_settings'
};

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({
            status: 'error',
            message: 'Supabase çevresel değişkenleri eksik.'
        }, { status: 500 });
    }

    // Admin işlemleri için yetkili client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    let allHealthy = true;

    for (const [serviceName, tableName] of Object.entries(SERVICES_MAP)) {
        const start = Date.now();
        try {
            // Sadece tek bir sütun alarak en hafif DB çağrısını yapıyoruz
            const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
            const end = Date.now();
            const latencyMs = end - start;

            if (error) {
                allHealthy = false;
                results.push({
                    name: serviceName,
                    status: 'error',
                    error: error.message,
                    latencyMs
                });
            } else {
                results.push({
                    name: serviceName,
                    status: 'online',
                    latencyMs
                });
            }
        } catch (err: any) {
            allHealthy = false;
            const latencyMs = Date.now() - start;
            results.push({
                name: serviceName,
                status: 'error',
                error: err.message || 'Bilinmeyen hata',
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
