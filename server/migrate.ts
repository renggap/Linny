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

    // Run project links migration
    const migrationPath3 = join(process.cwd(), 'server', 'migrations', '003_add_project_links.sql');
    const migrationSQL3 = readFileSync(migrationPath3, 'utf-8');
    db.exec(migrationSQL3);

    // Run role updates migration
    const migrationPath4 = join(process.cwd(), 'server', 'migrations', '004_update_roles.sql');
    const migrationSQL4 = readFileSync(migrationPath4, 'utf-8');
    db.exec(migrationSQL4);

    db.save();

    console.log('✅ Database migrations completed successfully');
    console.log('📊 Performance indexes created');
    console.log('🔐 Email verification, password reset, and 2FA tables created');
    console.log('👥 User roles updated (Admin→Administrator, Viewer→Guest)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();

export { runMigrations };
