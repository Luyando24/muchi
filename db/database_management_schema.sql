-- Database Management Module Schema
-- This schema creates tables for managing database backups and maintenance

-- Database Backups Table
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    size_mb DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'automatic')),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- References staff_users.id
    error_message TEXT -- Store error details if backup failed
);

-- Database Maintenance Log Table
CREATE TABLE IF NOT EXISTS database_maintenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL, -- 'backup', 'restore', 'optimize', 'vacuum', 'analyze'
    table_name VARCHAR(255), -- Specific table if operation was table-specific
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    duration_seconds INTEGER,
    details JSONB, -- Store operation details and results
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- References staff_users.id
);

-- Database Performance Metrics Table (for historical tracking)
CREATE TABLE IF NOT EXISTS database_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL, -- 'connection_count', 'query_time', 'table_size', etc.
    metric_value DECIMAL(15,4) NOT NULL,
    table_name VARCHAR(255), -- If metric is table-specific
    query_hash VARCHAR(64), -- If metric is query-specific
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_backups_type ON database_backups(type);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_log_created_at ON database_maintenance_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_operation_type ON database_maintenance_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_status ON database_maintenance_log(status);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON database_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON database_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_table ON database_performance_metrics(table_name);

-- Insert some sample data for development
INSERT INTO database_backups (filename, size_mb, type, description, status, created_at) VALUES
('muchi_backup_2024-01-15T10-30-00.sql', 45.67, 'automatic', 'Daily automatic backup', 'completed', '2024-01-15 10:30:00+00'),
('muchi_backup_2024-01-14T10-30-00.sql', 44.23, 'automatic', 'Daily automatic backup', 'completed', '2024-01-14 10:30:00+00'),
('muchi_backup_2024-01-13T15-45-00.sql', 43.89, 'manual', 'Pre-update backup', 'completed', '2024-01-13 15:45:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO database_maintenance_log (operation_type, status, duration_seconds, details, created_at) VALUES
('optimize', 'completed', 120, '{"tables_optimized": 15, "space_reclaimed_mb": 2.3}', '2024-01-15 11:00:00+00'),
('backup', 'completed', 45, '{"backup_size_mb": 45.67, "compression_ratio": 0.75}', '2024-01-15 10:30:00+00'),
('vacuum', 'completed', 30, '{"table": "support_tickets", "pages_removed": 100}', '2024-01-14 09:15:00+00')
ON CONFLICT DO NOTHING;