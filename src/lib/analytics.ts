export type EventType = 'view' | 'click' | 'scan';
export type TargetType = 'category' | 'product' | 'venue';

export interface AnalyticsEvent {
    eventType: EventType;
    targetId: string;
    targetType: TargetType;
    venueId: string;
    timestamp: number; // millisecond timestamp
    sessionId: string;
    metadata?: Record<string, any>; // extra info like scroll depth or time spent
}

export interface AdminActivityLog {
    id: string;
    adminId: string;
    action: 'create' | 'update' | 'delete' | 'login';
    resourceType: 'product' | 'category' | 'venue' | 'settings';
    resourceId: string;
    details: string;
    timestamp: number;
}

// Mock service for analytics
export const AnalyticsService = {
    logEvent: async (event: AnalyticsEvent) => {
        // In production, this would write to Firestore:
        // await db.collection(`restaurants/${event.venueId}/analytics`).add(event);
        console.log("[Analytics]", event);
    },

    trackSession: () => {
        // Check local storage for session ID or generate new
        if (typeof window === 'undefined') return "server-side";

        let sessionId = localStorage.getItem("qr_session_id");
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem("qr_session_id", sessionId);
        }
        return sessionId;
    }
};

export const LoggerService = {
    logAdminAction: async (log: Omit<AdminActivityLog, 'id' | 'timestamp'>) => {
        const entry: AdminActivityLog = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        // In production, write to Firestore:
        // await db.collection('admin_logs').add(entry);
        console.log("[Admin Log]", entry);
    }
};
