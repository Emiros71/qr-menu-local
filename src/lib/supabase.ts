
import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
    if (!_supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabase;
}

// Backward compatibility - lazy initialized
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
    get(_target, prop) {
        return (getSupabase() as Record<string | symbol, unknown>)[prop];
    }
});
