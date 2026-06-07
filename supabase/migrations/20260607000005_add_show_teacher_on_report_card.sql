-- Add show_teacher_on_report_card column to schools table
ALTER TABLE schools ADD COLUMN show_teacher_on_report_card BOOLEAN DEFAULT FALSE;
