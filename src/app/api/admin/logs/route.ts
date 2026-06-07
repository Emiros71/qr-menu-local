import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor, getSupabaseAdminClient, isSuperAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    if (!isSuperAdmin(await getAuthenticatedActor())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const { searchParams } = new URL(req.url);

        const limit = Number(searchParams.get('limit') || '100');
        const type = searchParams.get('type');
        const resource = searchParams.get('resource');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const searchUser = searchParams.get('searchUser');

        let query = supabaseAdmin
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Math.min(Math.max(limit, 1), 500));

        if (type && type !== 'ALL') {
            query = query.eq('action_type', type);
        }

        if (resource && resource !== 'ALL') {
            const resourceMap: Record<string, string> = {
                product: 'products',
                category: 'categories',
                venue: 'venues',
                allergen: 'allergens',
                settings: 'app_settings',
                auth: 'auth'
            };
            query = query.eq('resource', resourceMap[resource] || resource);
        }

        if (startDate) {
            query = query.gte('created_at', new Date(startDate).toISOString());
        }

        if (endDate) {
            query = query.lte('created_at', new Date(endDate).toISOString());
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        let logs = data || [];

        if (searchUser) {
            const lowered = searchUser.toLowerCase();
            logs = logs.filter((log: Record<string, unknown>) => {
                const details = (log.details || {}) as Record<string, unknown>;
                const email = String(details.user_email || '').toLowerCase();
                return email.includes(lowered);
            });
        }

        return NextResponse.json({ data: logs.slice(0, limit) });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
