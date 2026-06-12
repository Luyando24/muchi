-- ─────────────────────────────────────────────────────────────────────────────
-- MUCHI Email System Migration — Add Custom Notification Emails
-- Migration: 20260612000002_add_notification_emails.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE email_smtp_config 
ADD COLUMN IF NOT EXISTS notification_emails text NOT NULL DEFAULT '';
