# Database Setup Guide

This guide will help you set up PostgreSQL locally for the Flova application.

## Prerequisites

### Install PostgreSQL on Windows

1. **Download PostgreSQL**:
   - Visit [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Download the latest version (recommended: PostgreSQL 15 or 16)

2. **Install PostgreSQL**:
   - Run the installer as Administrator
   - During installation:
     - Set a password for the `postgres` superuser (remember this!)
     - Default port: `5432` (keep default)
     - Default locale: `[Default locale]` (keep default)
   - Complete the installation

3. **Add PostgreSQL to PATH** (if not done automatically):
   - Open System Properties → Environment Variables
   - Add `C:\Program Files\PostgreSQL\16\bin` to your PATH
   - Restart your terminal/IDE

### Alternative: Using Docker (Recommended for Development)

If you prefer Docker:

```bash
# Pull and run PostgreSQL container
docker run --name flova-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=flova_db \
  -p 5432:5432 \
  -d postgres:15
```

## Database Setup

### Step 1: Update Environment Variables

The `.env` file has been configured with default values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/flova_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flova_db
DB_USER=luyando
DB_PASSWORD=Pythonja@2
```

**Important**: Update `DB_PASSWORD` to match your PostgreSQL installation password.

### Step 2: Run Database Setup

Once PostgreSQL is installed and running:

```bash
# Install dependencies (if not already done)
npm install

# Run the database setup script
node scripts/setup-db.js
```

This script will:
- Create the `flova_db` database
- Apply the schema from `db/schema.sql`
- Insert sample data including:
  - A demo hospital: "Flova Demo Clinic"
  - An admin user with credentials:
    - Email: `admin@flova.demo`
    - Password: `admin123`

### Step 3: Verify Setup

Test the database connection:

```bash
# Connect to PostgreSQL (replace 'password' with your actual password)
psql -U postgres -h localhost -d flova_db

# List tables
\dt

# Check sample data
SELECT * FROM hospitals;
SELECT email, role FROM staff_users;

# Exit
\q
```

## Troubleshooting

### Common Issues

1. **"psql: command not found"**
   - PostgreSQL is not installed or not in PATH
   - Restart terminal after installation

2. **Connection refused**
   - PostgreSQL service is not running
   - Check Windows Services for "postgresql-x64-xx"
   - Or restart: `net start postgresql-x64-16`

3. **Authentication failed**
   - Wrong password in `.env` file
   - Update `DB_PASSWORD` to match your PostgreSQL password

4. **Database already exists**
   - Safe to ignore - script handles existing databases
   - To reset: `DROP DATABASE flova_db;` then re-run setup

### Manual Database Creation

If the script fails, create manually:

```sql
-- Connect as postgres user
psql -U postgres

-- Create database
CREATE DATABASE flova_db;

-- Connect to new database
\c flova_db

-- Run schema (copy-paste contents of db/schema.sql)
```

## Next Steps

After successful database setup:

1. The application will automatically use PostgreSQL instead of in-memory stores
2. Start the development server: `npm run dev`
3. Test API endpoints with real data persistence
4. Login with the sample admin credentials

## Production Considerations

For production deployment:

- Use environment-specific database credentials
- Enable SSL connections
- Set up database backups
- Configure connection pooling limits
- Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)