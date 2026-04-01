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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
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
        const params = new URLSearchParams();
        params.set('limit', String(limit));

        if (filters?.type) params.set('type', filters.type);
        if (filters?.resource) params.set('resource', filters.resource);
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);
        if (filters?.searchUser) params.set('searchUser', filters.searchUser);

        const response = await fetch(`/api/admin/logs?${params.toString()}`, {
            credentials: 'include',
            cache: 'no-store'
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Log fetch failed');
        }

        return result.data || [];
    }
};
