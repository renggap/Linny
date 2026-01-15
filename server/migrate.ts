import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabase } from './database.js';

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    const db = await getDatabase();
    console.log('🔄 Running database migrations...');

    // Run index migration
    const migrationPath1 = join(process.cwd(), 'server', 'migrations', '001_add_indexes.sql');
    const migrationSQL1 = readFileSync(migrationPath1, 'utf-8');
    db.exec(migrationSQL1);

    // Run auth tables migration
    const migrationPath2 = join(process.cwd(), 'server', 'migrations', '002_add_auth_tables.sql');
    const migrationSQL2 = readFileSync(migrationPath2, 'utf-8');
    db.exec(migrationSQL2);

    db.save();

    console.log('✅ Database migrations completed successfully');
    console.log('📊 Performance indexes created');
    console.log('🔐 Email verification, password reset, and 2FA tables created');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();

export { runMigrations };
