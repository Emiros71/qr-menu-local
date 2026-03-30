import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { daysToKeep = 30 } = body;

        // Geçerli bir sayı mı?
        if (isNaN(daysToKeep) || daysToKeep < 1) {
            return NextResponse.json({ error: 'Geçersiz gün sayısı' }, { status: 400 });
        }

        // Hesaplanacak tarih
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(daysToKeep));
        const isoThreshold = dateThreshold.toISOString();

        // Eski logları sil (ON DELETE CASCADE olmadığı için sadece bu tablodan silinir)
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
