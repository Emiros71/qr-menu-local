import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServerSupabaseUrl } from '@/utils/supabase/config';
import { getAuthenticatedActor, isSuperAdmin } from '@/server/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const debugRouteEnabled = process.env.DEBUG_AUTH_ROUTE_ENABLED === 'true';
    if (process.env.NODE_ENV === 'production' || !debugRouteEnabled) {
        return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
    }

    const actor = await getAuthenticatedActor();
    if (!isSuperAdmin(actor)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = getServerSupabaseUrl();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const cookieStore = await cookies();

    const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);

    if (!supabaseUrl || !anonKey) {
        return NextResponse.json({
            ok: false,
            reason: 'missing_env',
            supabaseUrl,
            hasAnonKey: !!anonKey,
            cookieNames,
        }, { status: 500 });
    }

    let healthStatus: number | null = null;
    let healthBody: string | null = null;
    let healthError: string | null = null;

    try {
        const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
            },
            cache: 'no-store',
        });
        healthStatus = response.status;
        healthBody = await response.text();
    } catch (error) {
        healthError = error instanceof Error ? error.message : String(error);
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            anonKey,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll() {},
                },
            }
        );

        const { data, error } = await supabase.auth.getUser();

        return NextResponse.json({
            ok: !error,
            supabaseUrl,
            hasAnonKey: true,
            cookieNames,
            healthStatus,
            healthBody,
            healthError,
            user: data.user ? {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role,
            } : null,
            authError: error ? {
                name: error.name,
                message: error.message,
                status: (error as { status?: number }).status ?? null,
                code: (error as { code?: string }).code ?? null,
            } : null,
        });
    } catch (error) {
        return NextResponse.json({
            ok: false,
            supabaseUrl,
            hasAnonKey: true,
            cookieNames,
            healthStatus,
            healthBody,
            healthError,
            unexpectedError: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
