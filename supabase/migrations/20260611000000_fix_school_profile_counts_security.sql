-- Fix security definer view issue by setting security_invoker = true
-- This ensures the view executes with the privileges of the querying user
-- and obeys Row Level Security (RLS) policies.

ALTER VIEW public.school_profile_counts SET (security_invoker = true);
