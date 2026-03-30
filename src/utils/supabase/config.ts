export function getBrowserSupabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getServerSupabaseUrl() {
    return process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}
