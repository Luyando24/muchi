import express from 'express';
import { RequestHandler } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../lib/db.js';

const router = express.Router();
const execAsync = promisify(exec);

// Database schema information interfaces
export interface TableInfo {
  table_name: string;
  table_schema: string;
  table_type: string;
  row_count: number;
  size_mb: number;
}

export interface DatabaseStats {
  total_tables: number;
  total_size_mb: number;
  total_rows: number;
  connection_count: number;
  uptime_seconds: number;
  version: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size_mb: number;
  created_at: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
}

// GET /api/database/stats - Get database statistics
export const handleGetDatabaseStats: RequestHandler = async (req, res) => {
  try {
    // Get database version
    const versionResult = await pool.query('SELECT version()');
    const version = versionResult.rows[0].version;

    // Get database size
    const sizeResult = await pool.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes
    `);

    // Get table count
    const tableCountResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    // Get total row count (approximate)
    const rowCountResult = await pool.query(`
      SELECT SUM(n_tup_ins + n_tup_upd) as total_rows
      FROM pg_stat_user_tables
    `);

    // Get connection count
    const connectionResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);

    // Get uptime
    const uptimeResult = await pool.query(`
      SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime_seconds
    `);

    const stats: DatabaseStats = {
      total_tables: parseInt(tableCountResult.rows[0].count),
      total_size_mb: Math.round(sizeResult.rows[0].size_bytes / (1024 * 1024)),
      total_rows: parseInt(rowCountResult.rows[0].total_rows || '0'),
      connection_count: parseInt(connectionResult.rows[0].count),
      uptime_seconds: Math.round(uptimeResult.rows[0].uptime_seconds),
      version: version.split(' ')[1] // Extract version number
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database statistics' });
  }
};

// GET /api/database/tables - Get table information
export const handleGetTables: RequestHandler = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.table_name,
        t.table_schema,
        t.table_type,
        COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as row_count,
        ROUND(
          CAST(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name)) AS numeric) / 1024 / 1024, 
          2
        ) as size_mb
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
      ORDER BY size_mb DESC
    `);

    const tables: TableInfo[] = result.rows.map(row => ({
      table_name: row.table_name,
      table_schema: row.table_schema,
      table_type: row.table_type,
      row_count: parseInt(row.row_count || '0'),
      size_mb: parseFloat(row.size_mb || '0')
    }));

    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch table information' });
  }
};

// GET /api/database/schema/:tableName - Get table schema
export const handleGetTableSchema: RequestHandler = async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching table schema:', error);
    res.status(500).json({ error: 'Failed to fetch table schema' });
  }
};

// POST /api/database/backup - Create database backup
export const handleCreateBackup: RequestHandler = async (req, res) => {
  try {
    const { type = 'manual', description } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `muchi_backup_${timestamp}.sql`;
    const backupPath = path.join(process.cwd(), 'backups', filename);

    // Ensure backups directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Create backup using pg_dump
    const dbUrl = `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'muchi_db'}`;
    
    const command = `pg_dump "${dbUrl}" > "${backupPath}"`;
    
    try {
      await execAsync(command);
      
      // Get file size
      const stats = await fs.stat(backupPath);
      const sizeMb = Math.round(stats.size / (1024 * 1024) * 100) / 100;

      // Store backup info in database
      const backupInfo = await pool.query(`
        INSERT INTO database_backups (filename, size_mb, type, description, status)
        VALUES ($1, $2, $3, $4, 'completed')
        RETURNING *
      `, [filename, sizeMb, type, description]);

      res.json({
        success: true,
        backup: {
          id: backupInfo.rows[0].id,
          filename,
          size_mb: sizeMb,
          created_at: backupInfo.rows[0].created_at,
          type,
          status: 'completed'
        }
      });
    } catch (execError) {
      console.error('Backup command failed:', execError);
      res.status(500).json({ error: 'Failed to create database backup' });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create database backup' });
  }
};

// GET /api/database/backups - List database backups
export const handleGetBackups: RequestHandler = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM database_backups 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    const backups: BackupInfo[] = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      size_mb: parseFloat(row.size_mb),
      created_at: row.created_at,
      type: row.type,
      status: row.status
    }));

    res.json(backups);
  } catch (error) {
    console.error('Error fetching backups:', error);
    // Return empty array if table doesn't exist yet
    res.json([]);
  }
};

// POST /api/database/restore - Restore database from backup
export const handleRestoreBackup: RequestHandler = async (req, res) => {
  try {
    const { backupId } = req.body;
    
    // Get backup info
    const backupResult = await pool.query(`
      SELECT * FROM database_backups WHERE id = $1
    `, [backupId]);

    if (backupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = backupResult.rows[0];
    const backupPath = path.join(process.cwd(), 'backups', backup.filename);

    // Check if backup file exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Restore database using psql
    const dbUrl = `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'muchi_db'}`;
    
    const command = `psql "${dbUrl}" < "${backupPath}"`;
    
    try {
      await execAsync(command);
      res.json({ success: true, message: 'Database restored successfully' });
    } catch (execError) {
      console.error('Restore command failed:', execError);
      res.status(500).json({ error: 'Failed to restore database' });
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
};

// POST /api/database/optimize - Optimize database
export const handleOptimizeDatabase: RequestHandler = async (req, res) => {
  try {
    // Run VACUUM and ANALYZE on all tables
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const results = [];
    
    for (const table of tablesResult.rows) {
      try {
        await pool.query(`VACUUM ANALYZE ${table.table_name}`);
        results.push({ table: table.table_name, status: 'optimized' });
      } catch (error) {
        results.push({ table: table.table_name, status: 'failed', error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error optimizing database:', error);
    res.status(500).json({ error: 'Failed to optimize database' });
  }
};

// GET /api/database/performance - Get performance metrics
export const handleGetPerformanceMetrics: RequestHandler = async (req, res) => {
  try {
    // Get slow queries
    const slowQueriesResult = await pool.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      ORDER BY mean_time DESC 
      LIMIT 10
    `);

    // Get table statistics
    const tableStatsResult = await pool.query(`
      SELECT 
        relname as table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
      FROM pg_stat_user_tables
      ORDER BY seq_scan DESC
      LIMIT 10
    `);

    // Get index usage
    const indexUsageResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 10
    `);

    res.json({
      slow_queries: slowQueriesResult.rows,
      table_stats: tableStatsResult.rows,
      index_usage: indexUsageResult.rows
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    // Return empty data if pg_stat_statements is not available
    res.json({
      slow_queries: [],
      table_stats: [],
      index_usage: []
    });
  }
};

// Routes
router.get('/stats', handleGetDatabaseStats);
router.get('/tables', handleGetTables);
router.get('/schema/:tableName', handleGetTableSchema);
router.post('/backup', handleCreateBackup);
router.get('/backups', handleGetBackups);
router.post('/restore', handleRestoreBackup);
router.post('/optimize', handleOptimizeDatabase);
router.get('/performance', handleGetPerformanceMetrics);

export default router;