import { NextResponse } from 'next/server';
import { getAuthenticatedActor, getSupabaseAdminClient, isSuperAdmin } from '@/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    if (!isSuperAdmin(await getAuthenticatedActor())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const body = await req.json();
        const { daysToKeep = 30 } = body;

        if (isNaN(daysToKeep) || daysToKeep < 1) {
            return NextResponse.json({ error: 'Geçersiz gün sayısı' }, { status: 400 });
        }

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(daysToKeep));
        const isoThreshold = dateThreshold.toISOString();

        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .delete()
            .lt('created_at', isoThreshold)
            .select('id');

        if (error) {
            console.error("Log temizleme hatası:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const deletedCount = data ? data.length : 0;

        return NextResponse.json({
            success: true,
            message: `${daysToKeep} günden eski ${deletedCount} adet log başarıyla temizlendi.`,
            deletedCount
        });

    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
