import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getSupabaseAdminClient } from '@/server/auth';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MAX_DETAILS_LENGTH = 8_000;
const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === 'true';
const ALLOWED_ACTIONS = new Set([
    'LOGIN',
    'LOGOUT',
    'CREATE_PRODUCT',
    'UPDATE_PRODUCT',
    'DELETE_PRODUCT',
    'CREATE_CATEGORY',
    'UPDATE_CATEGORY',
    'DELETE_CATEGORY',
    'UPDATE_VENUE',
    'CREATE_ALLERGEN',
    'UPDATE_ALLERGEN',
    'DELETE_ALLERGEN',
    'IMPORT_EXCEL',
    'OTHER',
]);
const ALLOWED_RESOURCES = new Set(['auth', 'products', 'categories', 'venues', 'allergens', 'app_settings']);

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetAt) {
        requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}

function getIp(request: Request): string {
    if (!TRUST_PROXY_HEADERS) {
        return 'unknown';
    }

    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

export async function POST(request: Request) {
    try {
        const ip = getIp(request);
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await request.json();
        const { action, resource, details } = body;
        const serializedDetails = JSON.stringify(details ?? {});

        if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (typeof resource !== 'string' || !ALLOWED_RESOURCES.has(resource)) {
            return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
        }

        if (serializedDetails.length > MAX_DETAILS_LENGTH) {
            return NextResponse.json({ error: 'Details payload is too large' }, { status: 400 });
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = getSupabaseAdminClient();
        const enrichedDetails = {
            ...(details && typeof details === 'object' ? details : {}),
            user_email: user.email || 'anonymous',
            log_user_id: user.id,
            ip_address: ip,
        };

        const { error } = await supabaseAdmin.from('audit_logs').insert({
            action_type: action,
            resource,
            details: enrichedDetails,
            user_id: user.id,
        });

        if (error) {
            console.error("API Log Insert Error:", error);
            return NextResponse.json({ error: 'Log insert failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("API Log Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
