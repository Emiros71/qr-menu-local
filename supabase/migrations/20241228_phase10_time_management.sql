-- Time Management Features for Phases 10
-- Add timezone to venues to handle local time calculations
ALTER TABLE venues ADD COLUMN timezone text DEFAULT 'Europe/Istanbul';

-- Add start_time and end_time to categories to handle time-based visibility
ALTER TABLE categories ADD COLUMN start_time time;
ALTER TABLE categories ADD COLUMN end_time time;

-- Update the RLS Policy for Categories to include time checks on the DB side if desired
-- Or just allow read and handle it on the application layer.
-- We will handle time-based filtering on the application layer for better client-side UX/Hydration control.
