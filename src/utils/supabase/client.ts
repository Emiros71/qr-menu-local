
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock or empty client during build to prevent crashing
        // This is safe because these components shouldn't be functional during build anyway
        return createBrowserClient(
            'http://localhost:54321', // Dummy URL
            'dummy-key'
        );
    }

    return createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    )
}
