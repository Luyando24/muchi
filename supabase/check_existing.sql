-- Check existing tables in public schema
SELECT tablename 
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public';

-- Check existing types (like user_role)
SELECT typname 
FROM pg_type 
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace 
WHERE nspname = 'public';
