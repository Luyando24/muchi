-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL, -- Academic, Administrative, Staff, Extracurricular, Holiday, etc.
    location TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "School admins can view their school's calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can insert calendar events for their school" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can update their school's calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can delete their school's calendar events" ON public.calendar_events;

-- Create policies using helper functions
CREATE POLICY "School admins can view their school's calendar events"
    ON public.calendar_events
    FOR SELECT
    USING (
        is_school_admin() AND school_id = get_my_school_id()
    );

CREATE POLICY "School admins can insert calendar events for their school"
    ON public.calendar_events
    FOR INSERT
    WITH CHECK (
        is_school_admin() AND school_id = get_my_school_id()
    );

CREATE POLICY "School admins can update their school's calendar events"
    ON public.calendar_events
    FOR UPDATE
    USING (
        is_school_admin() AND school_id = get_my_school_id()
    );

CREATE POLICY "School admins can delete their school's calendar events"
    ON public.calendar_events
    FOR DELETE
    USING (
        is_school_admin() AND school_id = get_my_school_id()
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_school_id ON public.calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);
