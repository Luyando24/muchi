-- Run this in your PostgreSQL interface to set the password
-- 1. Connect to PostgreSQL using the interface you have open
-- 2. Use these connection settings:
--    Server Name: localhost (or any name you prefer)
--    Host: localhost
--    Port: 5432
--    Database: postgres (default database)
--    User: postgres
--    Password: (leave empty for now)
-- 3. Once connected, run the following commands:

-- Set password for postgres user
ALTER USER postgres PASSWORD 'password123';

-- Create the database if it doesn't exist
CREATE DATABASE flova_db;

-- Grant all privileges to postgres user on the database
GRANT ALL PRIVILEGES ON DATABASE flova_db TO postgres;

-- Verify the setup
\l

-- You should see flova_db in the list of databases
-- After running these commands, you can run: node scripts/setup-db.js