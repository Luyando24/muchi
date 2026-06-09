-- Create ministry_calendar table
CREATE TABLE IF NOT EXISTS public.ministry_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Term' | 'Holiday'
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    midterm_begin DATE,
    midterm_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ministry_calendar ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DROP POLICY IF EXISTS "Allow public read-only access to ministry calendar" ON public.ministry_calendar;
DROP POLICY IF EXISTS "System Admins and Government can manage ministry calendar" ON public.ministry_calendar;

-- Policies
CREATE POLICY "Allow public read-only access to ministry calendar" ON public.ministry_calendar
    FOR SELECT USING (true);

CREATE POLICY "System Admins and Government can manage ministry calendar" ON public.ministry_calendar
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'system_admin' OR role = 'government' OR secondary_role = 'government')
        )
    );

COMMENT ON TABLE public.ministry_calendar IS 'Zambia national school calendar containing term dates and public holidays issued by the ministry';

INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2026', 'Term', 'Term 1', '2026-01-13', '2026-04-19', '2026-02-21', '2026-02-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2026', 'Term', 'Term 2', '2026-05-11', '2026-08-07', '2026-06-22', '2026-06-26');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2026', 'Term', 'Term 3', '2026-09-07', '2026-12-04', '2026-10-19', '2026-10-23');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2027', 'Term', 'Term 1', '2027-01-11', '2027-04-09', '2027-02-22', '2027-02-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2027', 'Term', 'Term 2', '2027-05-10', '2027-08-06', '2027-06-21', '2027-06-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2027', 'Term', 'Term 3', '2027-09-06', '2027-12-03', '2027-10-18', '2027-10-22');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2028', 'Term', 'Term 1', '2028-01-10', '2028-04-07', '2028-02-21', '2028-02-23');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2028', 'Term', 'Term 2', '2028-05-08', '2028-08-04', '2028-06-19', '2028-06-23');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2028', 'Term', 'Term 3', '2028-09-04', '2028-12-01', '2028-10-16', '2028-10-20');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2029', 'Term', 'Term 1', '2029-01-08', '2029-04-08', '2029-02-19', '2029-02-23');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2029', 'Term', 'Term 2', '2029-05-07', '2029-08-03', '2029-06-18', '2029-06-22');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2029', 'Term', 'Term 3', '2029-09-03', '2029-11-30', '2029-10-15', '2029-10-19');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2030', 'Term', 'Term 1', '2030-01-14', '2030-04-12', '2030-02-11', '2030-02-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2030', 'Term', 'Term 2', '2030-05-13', '2030-08-09', '2030-06-19', '2030-06-21');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date, midterm_begin, midterm_end) VALUES ('2030', 'Term', 'Term 3', '2030-09-09', '2030-12-06', '2030-10-14', '2030-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'New Year''s Day', '2026-01-01', '2026-01-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'New Year''s Day', '2027-01-01', '2027-01-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'New Year''s Day', '2028-01-01', '2028-01-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'New Year''s Day', '2029-01-01', '2029-01-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'New Year''s Day', '2030-01-01', '2030-01-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Women''s Day', '2026-03-08', '2026-03-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Women''s Day', '2027-03-08', '2027-03-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Women''s Day', '2028-03-08', '2028-03-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Women''s Day', '2029-03-08', '2029-03-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Women''s Day', '2030-03-08', '2030-03-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Youth Day', '2026-03-12', '2026-03-12');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Youth Day', '2027-03-12', '2027-03-12');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Youth Day', '2028-03-12', '2028-03-12');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Youth Day', '2029-03-12', '2029-03-12');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Youth Day', '2030-03-12', '2030-03-12');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Good Friday', '2026-04-03', '2026-04-03');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Good Friday', '2027-03-26', '2027-03-26');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Good Friday', '2028-04-19', '2028-04-19');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Good Friday', '2029-03-30', '2029-03-30');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Good Friday', '2030-04-18', '2030-04-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Holy Saturday', '2026-04-04', '2026-04-04');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Holy Saturday', '2027-03-27', '2027-03-27');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Holy Saturday', '2028-04-20', '2028-04-20');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Holy Saturday', '2029-03-31', '2029-03-31');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Holy Saturday', '2030-04-19', '2030-04-19');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Easter Monday', '2026-04-06', '2026-04-06');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Easter Monday', '2027-03-29', '2027-03-29');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Easter Monday', '2028-04-22', '2028-04-22');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Easter Monday', '2029-04-02', '2029-04-02');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Easter Monday', '2030-04-21', '2030-04-21');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Kenneth Kaunda Day', '2026-04-28', '2026-04-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Kenneth Kaunda Day', '2027-04-28', '2027-04-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Kenneth Kaunda Day', '2028-04-28', '2028-04-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Kenneth Kaunda Day', '2029-04-28', '2029-04-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Kenneth Kaunda Day', '2030-04-28', '2030-04-28');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Labour Day', '2026-05-01', '2026-05-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Labour Day', '2027-05-01', '2027-05-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Labour Day', '2028-05-01', '2028-05-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Labour Day', '2029-05-01', '2029-05-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Labour Day', '2030-05-01', '2030-05-01');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Africa Freedom Day', '2026-05-25', '2026-05-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Africa Freedom Day', '2027-05-25', '2027-05-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Africa Freedom Day', '2028-05-25', '2028-05-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Africa Freedom Day', '2029-05-25', '2029-05-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Africa Freedom Day', '2030-05-25', '2030-05-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Heroes Day', '2026-07-06', '2026-07-06');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Heroes Day', '2027-07-05', '2027-07-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Heroes Day', '2028-07-03', '2028-07-03');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Heroes Day', '2029-07-07', '2029-07-07');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Heroes Day', '2030-07-06', '2030-07-06');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Unity Day', '2026-07-07', '2026-07-07');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Unity Day', '2027-07-06', '2027-07-06');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Unity Day', '2028-07-04', '2028-07-04');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Unity Day', '2029-07-08', '2029-07-08');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Unity Day', '2030-07-07', '2030-07-07');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Farmers'' Day', '2026-08-03', '2026-08-03');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Farmers'' Day', '2027-08-02', '2027-08-02');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Farmers'' Day', '2028-08-07', '2028-08-07');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Farmers'' Day', '2029-08-05', '2029-08-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Farmers'' Day', '2030-08-04', '2030-08-04');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Teacher''s Day', '2026-10-05', '2026-10-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Teacher''s Day', '2027-10-05', '2027-10-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Teacher''s Day', '2028-10-05', '2028-10-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Teacher''s Day', '2029-10-05', '2029-10-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Teacher''s Day', '2030-10-05', '2030-10-05');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'National Prayers Day', '2026-10-18', '2026-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'National Prayers Day', '2027-10-18', '2027-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'National Prayers Day', '2028-10-18', '2028-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'National Prayers Day', '2029-10-18', '2029-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'National Prayers Day', '2030-10-18', '2030-10-18');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Independence Day', '2026-10-24', '2026-10-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Independence Day', '2027-10-24', '2027-10-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Independence Day', '2028-10-24', '2028-10-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Independence Day', '2029-10-24', '2029-10-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Independence Day', '2030-10-24', '2030-10-24');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2026', 'Holiday', 'Christmas Day', '2026-12-25', '2026-12-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2027', 'Holiday', 'Christmas Day', '2027-12-25', '2027-12-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2028', 'Holiday', 'Christmas Day', '2028-12-25', '2028-12-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2029', 'Holiday', 'Christmas Day', '2029-12-25', '2029-12-25');
INSERT INTO public.ministry_calendar (year, type, name, start_date, end_date) VALUES ('2030', 'Holiday', 'Christmas Day', '2030-12-25', '2030-12-25');
