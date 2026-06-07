import { NextResponse } from "next/server";
import { getAuthenticatedActor, getSupabaseAdminClient, isSuperAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";

const SETTINGS_KEY = "landing_page";

const defaultSettings = {
    backgroundImage: "/crowne_plaza_bg.jpg",
    title: "CROWNE PLAZA",
    subtitle: "ANKARA",
    instagramUrl: "https://instagram.com",
    websiteUrl: "https://crowneplaza.com",
    landingLogo: ""
};

export async function GET() {
    if (!isSuperAdmin(await getAuthenticatedActor())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const { data, error } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", SETTINGS_KEY)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data?.value || defaultSettings });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Settings fetch failed" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const actor = await getAuthenticatedActor(req);
    if (!isSuperAdmin(actor)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const value = body?.value;

        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
        }

        const normalizedSettings = {
            ...defaultSettings,
            ...value,
            title: typeof value.title === "string" ? value.title.trim() : defaultSettings.title,
            subtitle: typeof value.subtitle === "string" ? value.subtitle.trim() : defaultSettings.subtitle,
            instagramUrl: typeof value.instagramUrl === "string" ? value.instagramUrl.trim() : "",
            websiteUrl: typeof value.websiteUrl === "string" ? value.websiteUrl.trim() : "",
            backgroundImage: typeof value.backgroundImage === "string" ? value.backgroundImage : "",
            landingLogo: typeof value.landingLogo === "string" ? value.landingLogo : ""
        };

        const supabaseAdmin = getSupabaseAdminClient();
        const { data, error } = await supabaseAdmin
            .from("app_settings")
            .upsert(
                {
                    key: SETTINGS_KEY,
                    value: normalizedSettings,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "key" }
            )
            .select("value")
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data.value });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Settings update failed" },
            { status: 500 }
        );
    }
}
