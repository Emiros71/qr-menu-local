export type EventType = 'view' | 'click' | 'scan' | 'VIEW_MENU' | 'CLICK_PRODUCT';
export type TargetType = 'category' | 'product' | 'venue';

import { createClient } from "@/utils/supabase/client";

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
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('analytics_events')
                .insert([{
                    event_type: event.eventType,
                    target_id: event.targetId,
                    target_type: event.targetType,
                    venue_id: event.venueId,
                    session_id: event.sessionId,
                    metadata: event.metadata
                }]);

            if (error) {
                console.warn("[Analytics] Failed to save event:", error.message);
            }
        } catch (e) {
            console.error("[Analytics] Exception saving event", e);
        }
    },

    trackEvent: async (params: { type: string, venueId: string, productId?: string, metadata?: any }) => {
        const sessionId = AnalyticsService.trackSession();

        // Map simplified frontend events to structued AnalyticsEvent
        let eventType: EventType = 'view';
        let targetType: TargetType = 'venue';
        let targetId = params.venueId;

        if (params.type === 'VIEW_MENU') {
            eventType = 'view';
            targetType = 'venue';
        } else if (params.type === 'CLICK_PRODUCT') {
            eventType = 'click';
            targetType = 'product';
            targetId = params.productId || '';
        }

        const event: AnalyticsEvent = {
            eventType,
            targetId,
            targetType,
            venueId: params.venueId,
            timestamp: Date.now(),
            sessionId,
            metadata: params.metadata
        };

        await AnalyticsService.logEvent(event);
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
        // In production, write to Supabase
        console.log("[Admin Log]", entry);
    }
};
