import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Admin client to bypass RLS for writing logs
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const { action, resource, details } = body;

        // Try to get current user if exists (for CREATE/UPDATE actions)
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { } // Read-only here
                }
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        // Enrich details with user info if available
        const enrichedDetails = {
            ...details,
            user_email: user?.email || 'anonymous',
            // We could also duplicate user_id here for easier access
            log_user_id: user?.id
        };

        // Insert log using Admin Client
        const { error } = await supabaseAdmin.from('audit_logs').insert({
            action_type: action,
            resource: resource,
            details: enrichedDetails,
            user_id: user?.id || null, // FK is still good to have but details is safer for display
            // ip_address header can be read here if needed: request.headers.get('x-forwarded-for')
        });

        if (error) {
            console.error("API Log Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("API Log Error:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
