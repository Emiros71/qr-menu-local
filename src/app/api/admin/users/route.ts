import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor, getSupabaseAdminClient, isSuperAdmin, type AppRole } from "@/server/auth";

export const dynamic = "force-dynamic";

const VALID_ROLES: AppRole[] = ["SUPER_ADMIN", "VENUE_MANAGER", "STAFF"];

function normalizeRole(value: unknown): AppRole {
    if (typeof value === "string" && VALID_ROLES.includes(value as AppRole)) {
        return value as AppRole;
    }

    return "VENUE_MANAGER";
}

// GET all users (with their profiles)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    if (!isSuperAdmin(await getAuthenticatedActor())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        // Fetch auth users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // Fetch profiles
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, tags, venue_ids');

        if (profileError) {
            throw profileError;
        }

        const profiles = profileData || [];

        // Merge data
        const users = authData.users.map(u => {
            const p = profiles.find(p => p.id === u.id);
            return {
                id: u.id,
                email: u.email,
                created_at: u.created_at,
                full_name: p?.full_name || u.user_metadata?.full_name,
                role: p?.role || null,
                tags: Array.isArray(p?.tags) ? p.tags : [],
                venue_ids: Array.isArray(p?.venue_ids) ? p.venue_ids : []
            };
        });

        return NextResponse.json({ data: users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// CREATE a new user
export async function POST(req: NextRequest) {
    if (!isSuperAdmin(await getAuthenticatedActor())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const body = await req.json();
        const { email, password, full_name, role, venue_ids, tags } = body;
        const normalizedRole = normalizeRole(role);
        const normalizedVenueIds = Array.isArray(venue_ids) ? venue_ids.filter((id): id is string => typeof id === "string") : [];
        const normalizedTags = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
        }

        if (!/[A-Z]/.test(password)) {
            return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
        }

        if (!/[a-z]/.test(password)) {
            return NextResponse.json({ error: "Password must contain at least one lowercase letter" }, { status: 400 });
        }

        if (!/[0-9]/.test(password)) {
            return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
        }

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) throw authError;

        // 2. The trigger `handle_new_user` will create the profile. We just need to UPDATE it with the rest.
        if (authData.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email,
                    full_name,
                    role: normalizedRole,
                    venue_ids: normalizedRole === "SUPER_ADMIN" ? [] : normalizedVenueIds,
                    tags: normalizedTags
                });

            if (profileError) {
                console.warn("Profile sync failed after user creation", profileError);
            }
        }

        return NextResponse.json({ data: authData.user });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// UPDATE an existing user (Role, Tags, Password, etc.)
export async function PUT(req: NextRequest) {
    if (!isSuperAdmin(await getAuthenticatedActor())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const body = await req.json();
        const { id, email, password, full_name, role, venue_ids, tags } = body;
        const normalizedRole = role === undefined ? undefined : normalizeRole(role);
        const normalizedVenueIds = Array.isArray(venue_ids) ? venue_ids.filter((item): item is string => typeof item === "string") : undefined;
        const normalizedTags = Array.isArray(tags) ? tags.filter((item): item is string => typeof item === "string") : undefined;

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
        if (normalizedRole !== undefined) profileUpdates.role = normalizedRole;
        if (normalizedVenueIds !== undefined) profileUpdates.venue_ids = normalizedRole === "SUPER_ADMIN" ? [] : normalizedVenueIds;
        if (normalizedTags !== undefined) profileUpdates.tags = normalizedTags;
        if (full_name !== undefined) profileUpdates.full_name = full_name;

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({ id, ...profileUpdates });

            if (profileError) {
                console.warn("Profile sync failed during user update", profileError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// DELETE a user
export async function DELETE(req: NextRequest) {
    if (!isSuperAdmin(await getAuthenticatedActor())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const supabaseAdmin = getSupabaseAdminClient();
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
