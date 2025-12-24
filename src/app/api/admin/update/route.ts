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
        const { id, updates, table, action = 'update' } = body;

        // Table is always required. ID is required for update/delete but not create.
        if (!table) {
            return NextResponse.json({ error: "Missing table parameter" }, { status: 400 });
        }

        if (action !== 'create' && !id) {
            return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 });
        }

        // Explicitly allow only specific tables
        if (!['products', 'categories', 'venues', 'allergens'].includes(table)) {
            return NextResponse.json({ error: "Invalid table" }, { status: 403 });
        }

        let result;

        if (action === 'delete') {
            result = await supabase.from(table).delete().eq('id', id).select();
        } else if (action === 'create') {
            if (!updates) return NextResponse.json({ error: "Missing data" }, { status: 400 });
            result = await supabase.from(table).insert(updates).select();
        } else {
            if (!updates) return NextResponse.json({ error: "Missing updates" }, { status: 400 });
            result = await supabase.from(table).update(updates).eq('id', id).select();
        }
        const { data, error } = result;

        if (error) {
            console.error(`${action.toUpperCase()} Error:`, error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (err) {
        console.error("Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
