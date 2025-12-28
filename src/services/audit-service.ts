import { createClient } from "@/utils/supabase/client";

export type AuditAction =
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'CREATE_PRODUCT'
    | 'UPDATE_PRODUCT'
    | 'DELETE_PRODUCT'
    | 'CREATE_CATEGORY'
    | 'UPDATE_CATEGORY'
    | 'DELETE_CATEGORY'
    | 'UPDATE_VENUE'
    | 'CREATE_ALLERGEN'
    | 'UPDATE_ALLERGEN'
    | 'DELETE_ALLERGEN'
    | 'IMPORT_EXCEL'
    | 'OTHER';

export interface LogEntry {
    action: AuditAction;
    resource: string;
    details?: Record<string, any>;
}

export const AuditService = {
    /**
     * Records an action to the audit_logs table via API.
     */
    async log(entry: LogEntry) {
        try {
            // Get user from client side first to ensure we send it
            // This fixes issues where cookies might not be read correctly by the API route
            let userEmail = 'anonymous';
            let userId = null;

            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    userEmail = user.email || 'unknown';
                    userId = user.id;
                }
            } catch (e) {
                // Ignore auth checking errors
            }

            // Enrich details with user info
            const enrichedDetails = {
                ...entry.details,
                user_email: entry.details?.user_email || userEmail,
                log_user_id: userId
            };

            await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...entry,
                    details: enrichedDetails
                })
            });
        } catch (err) {
            console.error("AuditLog Error:", err);
        }
    },

    /**
     * Fetches logs for the admin panel using client-side auth.
     */
    async getLogs(limit = 100, filters?: { type?: string, resource?: string, startDate?: string, endDate?: string, searchUser?: string }) {
        // Use the browser client which has the session
        const supabase = createClient();

        let query = supabase
            .from('audit_logs')
            .select('*') // Removed join for now to debug
            .order('created_at', { ascending: false })
            .limit(limit);

        if (filters?.type && filters.type !== 'ALL') {
            query = query.eq('action_type', filters.type);
        }

        if (filters?.resource && filters.resource !== 'ALL') {
            query = query.eq('resource', filters.resource);
        }

        if (filters?.searchUser) {
            // Filter by email in details JSON
            query = query.textSearch('details', `'${filters.searchUser}'`);
            // Note: Use simple text match or specific JSON path if PostgREST supports it easily, 
            // but for now simple text search on JSONB is effective for email.
        }

        if (filters?.startDate) {
            // Convert local input time to UTC ISO string for comparison
            // Browser creates Date from local string -> toISOString gives UTC
            query = query.gte('created_at', new Date(filters.startDate).toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('created_at', new Date(filters.endDate).toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }
};
