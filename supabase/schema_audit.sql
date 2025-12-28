-- Create a table for Audit Logs
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'LOGIN', 'LOGOUT', 'CREATE_PRODUCT', 'UPDATE_VENUE' etc.
  resource TEXT NOT NULL, -- 'auth', 'product', 'venue', 'allergen'
  details JSONB, -- Stores metadata like { product_name: "Burger", old_price: 100, new_price: 150 }
  ip_address TEXT,
  
  -- Constraints
  CONSTRAINT action_type_length CHECK (char_length(action_type) > 0)
);

-- Turn on RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. View: Only Venue Managers (and up) can view logs. 
-- For now, letting authenticated users view logs since all our users are admins essentially.
CREATE POLICY "Admins can view audit logs" 
  ON public.audit_logs FOR SELECT 
  USING (auth.role() = 'authenticated');

-- 2. Insert: Authenticated users can insert logs (for their own actions)
CREATE POLICY "Admins can insert audit logs" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Index for faster querying by date and action
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
