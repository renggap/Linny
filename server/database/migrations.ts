/**
 * @fileoverview Versioned migration system with rollback support
 * @description Manages database schema migrations with version tracking
 * @module migrations
 */

import { DatabaseManager } from '../database.js';
import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Migration interface
 */
export interface Migration {
    /**
     * Migration version (timestamp or sequential number)
     */
    version: string;

    /**
     * Migration name/description
     */
    name: string;

    /**
     * SQL to apply migration
     */
    up: string;

    /**
     * SQL to rollback migration
     */
    down: string;
}

/**
 * Migration status
 */
export interface MigrationStatus {
    version: string;
    name: string;
    appliedAt: string;
}

/**
 * Migration table name
 */
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Get all available migrations
 */
export function getAvailableMigrations(): Migration[] {
    // Define migrations manually to avoid file system issues
    const migrationFiles = [
        '001_add_indexes.sql',
        '002_add_auth_tables.sql',
    ];

    return migrationFiles.map((file) => {
        const version = file.split('_')[0];
        const name = file
            .replace(`${version}_`, '')
            .replace('.sql', '')
            .replace(/_/g, ' ');

        return {
            version: version as string,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            up: readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', file), 'utf-8'),
            down: `-- Rollback for ${file}\n-- Manual rollback required`,
        };
    }).sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Get applied migrations from database
 */
export async function getAppliedMigrations(db: DatabaseManager): Promise<MigrationStatus[]> {
    try {
        // Check if migrations table exists
        const tableExists = await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [MIGRATIONS_TABLE]
        );

        if (!tableExists) {
            return [];
        }

        const rows = await db.all(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY version`);
        return rows.map((row: any) => ({
            version: row.version,
            name: row.name,
            appliedAt: row.applied_at,
        }));
    } catch (error) {
        logger.error('Error getting applied migrations:', error);
        return [];
    }
}

/**
 * Create migrations table
 */
export async function createMigrationsTable(db: DatabaseManager): Promise<void> {
    await db.run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Apply a single migration
 */
export async function applyMigration(db: DatabaseManager, migration: Migration): Promise<void> {
    logger.info(`Applying migration: ${migration.version} - ${migration.name}`);

    try {
        // Execute migration SQL
        db.exec(migration.up);

        // Record migration
        await db.run(
            `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`,
            [migration.version, migration.name, db.now()]
        );

        // Save database
        db.save();

        logger.info(`Migration applied successfully: ${migration.version}`);
    } catch (error) {
        logger.error(`Migration failed: ${migration.version}`, error);
        throw new Error(`Failed to apply migration ${migration.version}: ${error}`);
    }
}

/**
 * Rollback a single migration
 */
export async function rollbackMigration(db: DatabaseManager, migration: Migration): Promise<void> {
    logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);

    try {
        // Execute rollback SQL
        if (migration.down && !migration.down.startsWith('--')) {
            db.exec(migration.down);
        } else {
            logger.warn(`No rollback SQL for migration ${migration.version}, manual rollback required`);
        }

        // Remove migration record
        await db.run(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`, [migration.version]);

        // Save database
        db.save();

        logger.info(`Migration rolled back successfully: ${migration.version}`);
    } catch (error) {
        logger.error(`Rollback failed: ${migration.version}`, error);
        throw new Error(`Failed to rollback migration ${migration.version}: ${error}`);
    }
}

/**
 * Get pending migrations
 */
export async function getPendingMigrations(db: DatabaseManager): Promise<Migration[]> {
    const available = getAvailableMigrations();
    const applied = await getAppliedMigrations(db);
    const appliedVersions = new Set(applied.map((m) => m.version));

    return available.filter((m) => !appliedVersions.has(m.version));
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: DatabaseManager): Promise<void> {
    logger.info('Starting database migrations...');

    // Ensure migrations table exists
    await createMigrationsTable(db);

    // Get pending migrations
    const pending = await getPendingMigrations(db);

    if (pending.length === 0) {
        logger.info('No pending migrations');
        return;
    }

    logger.info(`Found ${pending.length} pending migration(s)`);

    // Apply migrations in order
    for (const migration of pending) {
        await applyMigration(db, migration);
    }

    logger.info('All migrations completed successfully');
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(db: DatabaseManager, targetVersion: string): Promise<void> {
    logger.info(`Rolling back to version: ${targetVersion}`);

    const applied = await getAppliedMigrations(db);
    const toRollback = applied.filter((m) => m.version > targetVersion);

    if (toRollback.length === 0) {
        logger.info('No migrations to rollback');
        return;
    }

    // Rollback in reverse order
    for (let i = toRollback.length - 1; i >= 0; i--) {
        const migration = getAvailableMigrations().find((m) => m.version === toRollback[i]?.version);
        if (migration) {
            await rollbackMigration(db, migration);
        } else {
            logger.warn(`Migration ${toRollback[i]?.version} not found in available migrations`);
        }
    }

    logger.info(`Rollback to version ${targetVersion} completed`);
}

/**
 * Get current migration version
 */
export async function getCurrentVersion(db: DatabaseManager): Promise<string | null> {
    const applied = await getAppliedMigrations(db);
    if (applied.length === 0) {
        return null;
    }
    const lastMigration = applied[applied.length - 1];
    return lastMigration ? lastMigration.version : null;
}

/**
 * Validate migration state
 */
export async function validateMigrations(db: DatabaseManager): Promise<boolean> {
    const applied = await getAppliedMigrations(db);
    const available = getAvailableMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));
    const availableVersions = new Set(available.map((m) => m.version));

    // Check for applied migrations that don't exist
    const invalid = applied.filter((m) => !availableVersions.has(m.version));
    if (invalid.length > 0) {
        logger.error('Found applied migrations that no longer exist:', invalid);
        return false;
    }

    // Check for missing migration files
    const missing = available.filter((m) => !appliedVersions.has(m.version));
    if (missing.length > 0) {
        logger.warn('Found unapplied migrations:', missing.map((m) => m.version));
    }

    return true;
}

export default {
    getAvailableMigrations,
    getAppliedMigrations,
    createMigrationsTable,
    applyMigration,
    rollbackMigration,
    getPendingMigrations,
    runMigrations,
    rollbackToVersion,
    getCurrentVersion,
    validateMigrations,
};
