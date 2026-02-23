-- Migration to add Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (so public menus can log events)
CREATE POLICY "Allow public insert to analytics_events" 
ON public.analytics_events FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

-- Super Admins can see all analytics
CREATE POLICY "Super Admins can view analytics_events" 
ON public.analytics_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
);

-- Venue Managers can see their own venue's analytics
CREATE POLICY "Venue Managers can view their own analytics_events" 
ON public.analytics_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'VENUE_MANAGER' AND venue_ids @> ARRAY[analytics_events.venue_id]
    )
);

-- Create some indexes for fast querying in Dashboard
CREATE INDEX IF NOT EXISTS idx_analytics_venue_id ON public.analytics_events(venue_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
