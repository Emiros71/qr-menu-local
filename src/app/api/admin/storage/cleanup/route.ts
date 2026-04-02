import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getServerSupabaseUrl } from "@/utils/supabase/config";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
    const supabaseUrl = getServerSupabaseUrl();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase admin configuration is missing.");
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

async function isSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return false;

    try {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const resolvedRole = profile?.role || user.user_metadata?.role || "SUPER_ADMIN";
        return resolvedRole === "SUPER_ADMIN";
    } catch {
        return (user.user_metadata?.role || "SUPER_ADMIN") === "SUPER_ADMIN";
    }
}

function extractPathFromPublicUrl(url: string, bucketName: string) {
    try {
        const parsed = new URL(url);
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const index = parsed.pathname.indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    } catch {
        return null;
    }
}

function collectReferencedPaths(value: unknown, bucketName: string, paths: Set<string>) {
    if (typeof value === "string") {
        const extracted = extractPathFromPublicUrl(value, bucketName);
        if (extracted) paths.add(extracted);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach(item => collectReferencedPaths(item, bucketName, paths));
        return;
    }

    if (value && typeof value === "object") {
        Object.values(value as Record<string, unknown>).forEach(item => collectReferencedPaths(item, bucketName, paths));
    }
}

type StorageEntry = {
    name: string;
    id?: string | null;
    metadata?: Record<string, unknown> | null;
};

async function listFilesRecursively(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    bucketName: string,
    folder: string
): Promise<string[]> {
    const collected: string[] = [];
    const { data, error } = await supabaseAdmin.storage.from(bucketName).list(folder, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" }
    });

    if (error) {
        throw new Error(`Storage list failed for "${folder || "/"}": ${error.message}`);
    }

    for (const entry of (data || []) as StorageEntry[]) {
        const nextPath = folder ? `${folder}/${entry.name}` : entry.name;
        const isFile = !!entry.metadata;
        if (isFile) {
            collected.push(nextPath);
        } else {
            collected.push(...await listFilesRecursively(supabaseAdmin, bucketName, nextPath));
        }
    }

    return collected;
}

export async function POST() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "qr-menu";
        const referencedPaths = new Set<string>();

        const { data: settingsRows } = await supabaseAdmin
            .from("app_settings")
            .select("value");
        (settingsRows || []).forEach((row: { value?: unknown }) => collectReferencedPaths(row.value, bucketName, referencedPaths));

        const { data: venues } = await supabaseAdmin
            .from("venues")
            .select("cover_image, logo");
        (venues || []).forEach((row: Record<string, unknown>) => {
            collectReferencedPaths(row.cover_image, bucketName, referencedPaths);
            collectReferencedPaths(row.logo, bucketName, referencedPaths);
        });

        const { data: categories } = await supabaseAdmin
            .from("categories")
            .select("image");
        (categories || []).forEach((row: Record<string, unknown>) => collectReferencedPaths(row.image, bucketName, referencedPaths));

        const { data: products } = await supabaseAdmin
            .from("products")
            .select("image");
        (products || []).forEach((row: Record<string, unknown>) => collectReferencedPaths(row.image, bucketName, referencedPaths));

        const files = await listFilesRecursively(supabaseAdmin, bucketName, "");
        const deletablePaths = files.filter(path => !referencedPaths.has(path));

        if (deletablePaths.length === 0) {
            return NextResponse.json({
                deletedCount: 0,
                totalFiles: files.length,
                referencedCount: referencedPaths.size,
                message: "Silinecek kullanılmayan görsel bulunamadı."
            });
        }

        const { error: removeError } = await supabaseAdmin.storage.from(bucketName).remove(deletablePaths);
        if (removeError) {
            throw new Error(removeError.message);
        }

        return NextResponse.json({
            deletedCount: deletablePaths.length,
            totalFiles: files.length,
            referencedCount: referencedPaths.size,
            deletedPaths: deletablePaths.slice(0, 50)
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Cleanup failed" },
            { status: 500 }
        );
    }
}
