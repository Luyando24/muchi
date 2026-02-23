-- Clear specific mock/seed data from schools table
DELETE FROM schools WHERE name LIKE '%Test School%';
DELETE FROM schools WHERE name = 'Chongwe Secondary School';

-- Clear mock/seed users from auth.users (cascades to profiles)
DELETE FROM auth.users WHERE email LIKE '%@test.com';
DELETE FROM auth.users WHERE email LIKE '%@example.com';
DELETE FROM auth.users WHERE email LIKE '%@chongwe.edu.zm';

-- Uncomment the following line to clear ALL schools and related data (students, teachers, etc.)
-- TRUNCATE schools CASCADE;

