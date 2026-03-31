import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getServerSupabaseUrl } from "@/utils/supabase/config";

export const dynamic = "force-dynamic";

// Initialize Supabase Admin Client (Bypasses RLS & can manage users)
function getSupabaseAdmin() {
    const supabaseUrl = getServerSupabaseUrl();
    return createClient(
        supabaseUrl!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

// Helper to check if the requester is a SUPER_ADMIN
async function isSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) return false;

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'SUPER_ADMIN' || user.user_metadata?.role === 'SUPER_ADMIN';
    } catch {
        return user.user_metadata?.role === 'SUPER_ADMIN';
    }
}

// GET all users (with their profiles)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    if (!await isSuperAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdmin();
        // Fetch auth users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // Fetch profiles
        const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
        if (profileError) throw profileError;

        // Merge data
        const users = authData.users.map(u => {
            const p = profiles.find(p => p.id === u.id);
            return {
                id: u.id,
                email: u.email,
                created_at: u.created_at,
                full_name: p?.full_name || u.user_metadata?.full_name,
                role: p?.role || 'STAFF',
                tags: p?.tags || [],
                venue_ids: p?.venue_ids || []
            };
        });

        return NextResponse.json({ data: users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// CREATE a new user
export async function POST(req: NextRequest) {
    if (!await isSuperAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { email, password, full_name, role, venue_ids, tags } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        });

        if (authError) throw authError;

        // 2. The trigger `handle_new_user` will create the profile. We just need to UPDATE it with the rest.
        if (authData.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ role, venue_ids: venue_ids || [], tags })
                .eq('id', authData.user.id);

            if (profileError) {
                console.error("Profile update failed after user creation", profileError);
            }
        }

        return NextResponse.json({ data: authData.user });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// UPDATE an existing user (Role, Tags, Password, etc.)
export async function PUT(req: NextRequest) {
    if (!await isSuperAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { id, email, password, full_name, role, venue_ids, tags } = body;

        if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

        // Update Auth Data if needed
        const authUpdates: Record<string, unknown> = {};
        if (email) authUpdates.email = email;
        if (password) authUpdates.password = password;
        if (full_name) authUpdates.user_metadata = { full_name };

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates as import('@supabase/supabase-js').AdminUserAttributes);
            if (authError) throw authError;
        }

        // Update Profile Data
        const profileUpdates: Record<string, unknown> = {};
        if (role !== undefined) profileUpdates.role = role;
        if (venue_ids !== undefined) profileUpdates.venue_ids = venue_ids;
        if (tags !== undefined) profileUpdates.tags = tags;
        if (full_name !== undefined) profileUpdates.full_name = full_name;

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('id', id);

            if (profileError) throw profileError;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// DELETE a user
export async function DELETE(req: NextRequest) {
    if (!await isSuperAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;
        // The profile will be deleted automatically due to ON DELETE CASCADE

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
