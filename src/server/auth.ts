import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getServerSupabaseUrl } from "@/utils/supabase/config";

export type AppRole = "SUPER_ADMIN" | "VENUE_MANAGER" | "STAFF";

export interface AppProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: AppRole;
    venue_ids: string[];
    tags: string[];
}

export interface AuthenticatedActor {
    user: User;
    profile: AppProfile;
}

const VALID_ROLES = new Set<AppRole>(["SUPER_ADMIN", "VENUE_MANAGER", "STAFF"]);

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeProfile(value: Record<string, unknown> | null): AppProfile | null {
    if (!value || typeof value.role !== "string" || !VALID_ROLES.has(value.role as AppRole)) {
        return null;
    }

    return {
        id: String(value.id),
        email: typeof value.email === "string" ? value.email : null,
        full_name: typeof value.full_name === "string" ? value.full_name : null,
        role: value.role as AppRole,
        venue_ids: normalizeStringArray(value.venue_ids),
        tags: normalizeStringArray(value.tags),
    };
}

export function getSupabaseAdminClient() {
    const supabaseUrl = getServerSupabaseUrl();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase admin configuration is missing.");
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

async function getUserFromBearerToken(request: Request): Promise<User | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return null;
    }

    const supabaseUrl = getServerSupabaseUrl();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return null;
    }

    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
        return null;
    }

    return data.user ?? null;
}

export async function getAuthenticatedUser(request?: Request): Promise<User | null> {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
        return session.user;
    }

    if (!request) {
        return null;
    }

    return getUserFromBearerToken(request);
}

export async function getAuthenticatedActor(request?: Request): Promise<AuthenticatedActor | null> {
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return null;
    }

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, email, full_name, role, venue_ids, tags")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            return null;
        }

        const profile = normalizeProfile(data as Record<string, unknown> | null);
        if (!profile) {
            return null;
        }

        return { user, profile };
    } catch {
        return null;
    }
}

export function isSuperAdmin(actor: AuthenticatedActor | null): boolean {
    return actor?.profile.role === "SUPER_ADMIN";
}

export function canAccessVenue(actor: AuthenticatedActor, venueId: string | null | undefined): boolean {
    if (actor.profile.role === "SUPER_ADMIN") {
        return true;
    }

    if (!venueId || actor.profile.role !== "VENUE_MANAGER") {
        return false;
    }

    return actor.profile.venue_ids.includes(venueId);
}
