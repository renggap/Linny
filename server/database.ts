import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types matching the frontend types (without password)
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string;
  role: string;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface DbTeam {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  identifier: string;
  icon: string;
  team_id: string;
  description: string | null;
  is_public: number;
  public_slug: string | null;
  lead_id: string | null;
  leadId?: string | null; // Allow both lead_id and leadId for API compatibility
  start_date: string | null;
  startDate?: string | null;
  target_date: string | null;
  targetDate?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  due_date: string | null;
}

export interface DbComment {
  id: string;
  content: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  issue_id: string;
  is_read: number;
  actor_id: string | null;
  created_at: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  type: string;
  project_id: string | null;
  issue_id: string | null;
  entity_title: string | null;
  description: string | null;
  created_at: string;
}

export interface DbRefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface DbProjectLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  created_at: string;
}

class DatabaseManager {
  private db: Database | null = null;
  private dbPath: string;
  private SQL: SqlJsStatic | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(dbPath: string = './linear_clone.db') {
    this.dbPath = join(__dirname, dbPath);
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.SQL) return;

    // Initialize sql.js
    const sqlJs = await initSqlJs();
    this.SQL = sqlJs;

    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new sqlJs.Database(buffer);
      // Run migrations on existing database
      this.runMigrations();
      this.save();
    } else {
      this.db = new sqlJs.Database();
      this.initializeSchema();
      this.save();
    }

    // Enable foreign keys
    this.run('PRAGMA foreign_keys = ON');
  }

  private initializeSchema(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.exec(schema);
    this.runMigrations();
  }

  private runMigrations(): void {
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = [
      '001_add_indexes.sql',
      '002_add_auth_tables.sql',
      '003_add_project_links.sql'
    ];

    for (const file of migrationFiles) {
      try {
        const migrationPath = join(migrationsDir, file);
        if (existsSync(migrationPath)) {
          const migration = readFileSync(migrationPath, 'utf-8');
          this.exec(migration);
          console.log(`Applied migration: ${file}`);
        }
      } catch (error) {
        // Ignore errors - table might already exist
        console.log(`Migration ${file} already applied or skipped`);
      }
    }
  }

  // Ensure database is initialized before operations
  public async ready(): Promise<Database> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Save database to file
  save(): void {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
    }
  }

  // Helper to generate UUID
  generateId(): string {
    return crypto.randomUUID();
  }

  // Helper to get current timestamp
  now(): string {
    return new Date().toISOString();
  }

  // Execute SQL without returning results
  // WARNING: This method does NOT use parameterized queries.
  // NEVER use this with user input. Only use for static SQL (schema initialization).
  exec(sql: string): void {
    if (this.db) {
      this.db.run(sql);
    }
  }

  // Run SQL and return results (parameterized queries)
  // Always use parameterized queries with ? placeholders to prevent SQL injection
  run(sql: string, params: any[] = []): any {
    if (this.db) {
      return this.db.run(sql, params);
    }
    return null;
  }

  // Get single row (parameterized queries)
  // Always use parameterized queries with ? placeholders to prevent SQL injection
  get(sql: string, params: any[] = []): any {
    if (this.db) {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      stmt.free();
    }
    return null;
  }

  // Get all rows (parameterized queries)
  // Always use parameterized queries with ? placeholders to prevent SQL injection
  all(sql: string, params: any[] = []): any[] {
    const results: any[] = [];
    if (this.db) {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
    }
    return results;
  }

  // === USER OPERATIONS ===

  async createUser(data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      `INSERT INTO users (id, name, email, password_hash, avatar_url, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.email, data.password_hash, data.avatar_url, data.role, now, now]
    );
    this.save();
    return { id, ...data, created_at: now, updated_at: now };
  }

  async getUserById(id: string): Promise<DbUser | null> {
    await this.ready();
    return this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    await this.ready();
    return this.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async getAllUsers(): Promise<DbUser[]> {
    await this.ready();
    return this.all('SELECT id, name, email, avatar_url, role, created_at, updated_at FROM users');
  }

  async updateUser(id: string, updates: Partial<Omit<DbUser, 'id' | 'created_at'>>): Promise<void> {
    await this.ready();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(updates.avatar_url); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(updates.password_hash); }

    fields.push('updated_at = ?');
    values.push(this.now());
    values.push(id);

    this.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  async updateUserPassword(id: string, password_hash: string): Promise<void> {
    await this.ready();
    this.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [password_hash, this.now(), id]);
    this.save();
  }

  async deleteUser(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM users WHERE id = ?', [id]);
    this.save();
  }

  // === TEAM OPERATIONS ===

  async createTeam(data: Omit<DbTeam, 'id' | 'created_at'>): Promise<DbTeam> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run('INSERT INTO teams (id, name, icon, created_at) VALUES (?, ?, ?, ?)', [id, data.name, data.icon, now]);
    this.save();
    return { id, ...data, created_at: now };
  }

  async getTeamById(id: string): Promise<DbTeam | null> {
    await this.ready();
    return this.get('SELECT * FROM teams WHERE id = ?', [id]);
  }

  async getAllTeams(): Promise<DbTeam[]> {
    await this.ready();
    return this.all('SELECT * FROM teams');
  }

  async getTeamMembers(teamId: string): Promise<DbUser[]> {
    await this.ready();
    return this.all(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.created_at, u.updated_at
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.team_id = ?
    `, [teamId]);
  }

  async addTeamMember(teamId: string, userId: string): Promise<void> {
    await this.ready();
    this.run('INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)', [teamId, userId]);
    this.save();
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
    this.save();
  }

  async deleteTeam(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM teams WHERE id = ?', [id]);
    this.save();
  }

  // === PROJECT OPERATIONS ===

  async createProject(data: Omit<DbProject, 'id' | 'created_at' | 'updated_at'>): Promise<DbProject> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      `INSERT INTO projects (id, name, identifier, icon, team_id, description, is_public, public_slug, lead_id, start_date, target_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.name, data.identifier, data.icon, data.team_id,
        data.description ?? null, data.is_public ? 1 : 0, data.public_slug ?? null,
        data.lead_id ?? null, data.start_date ?? null, data.target_date ?? null,
        now, now
      ]
    );
    this.save();
    return {
      id, ...data,
      created_at: now,
      updated_at: now,
      is_public: data.is_public ? 1 : 0
    };
  }

  async getProjectById(id: string): Promise<DbProject | null> {
    await this.ready();
    return this.get('SELECT * FROM projects WHERE id = ?', [id]);
  }

  async getProjectBySlug(slug: string): Promise<DbProject | null> {
    await this.ready();
    return this.get('SELECT * FROM projects WHERE public_slug = ? AND is_public = 1', [slug]);
  }

  async getProjectsByTeam(teamId: string): Promise<DbProject[]> {
    await this.ready();
    return this.all('SELECT * FROM projects WHERE team_id = ?', [teamId]);
  }

  async getAllProjects(): Promise<DbProject[]> {
    await this.ready();
    return this.all('SELECT * FROM projects');
  }

  async updateProject(id: string, updates: Partial<Omit<DbProject, 'id' | 'created_at'>>): Promise<void> {
    await this.ready();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.identifier !== undefined) { fields.push('identifier = ?'); values.push(updates.identifier); }
    if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.is_public !== undefined) { fields.push('is_public = ?'); values.push(updates.is_public ? 1 : 0); }
    if (updates.public_slug !== undefined) { fields.push('public_slug = ?'); values.push(updates.public_slug); }
    if (updates.lead_id !== undefined) { fields.push('lead_id = ?'); values.push(updates.lead_id); }
    if (updates.leadId !== undefined) { fields.push('lead_id = ?'); values.push(updates.leadId); }
    if (updates.start_date !== undefined) { fields.push('start_date = ?'); values.push(updates.start_date); }
    if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(updates.startDate); }
    if (updates.target_date !== undefined) { fields.push('target_date = ?'); values.push(updates.target_date); }
    if (updates.targetDate !== undefined) { fields.push('target_date = ?'); values.push(updates.targetDate); }

    fields.push('updated_at = ?');
    values.push(this.now());
    values.push(id);

    this.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  async deleteProject(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM projects WHERE id = ?', [id]);
    this.save();
  }

  // === PROJECT LINK OPERATIONS ===

  async createProjectLink(data: Omit<DbProjectLink, 'id' | 'created_at'>): Promise<DbProjectLink> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      'INSERT INTO project_links (id, project_id, title, url, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.project_id, data.title, data.url, now]
    );
    this.save();
    return { id, ...data, created_at: now };
  }

  async getProjectLinks(projectId: string): Promise<DbProjectLink[]> {
    await this.ready();
    return this.all('SELECT * FROM project_links WHERE project_id = ? ORDER BY created_at ASC', [projectId]);
  }

  async updateProjectLink(id: string, updates: Partial<Omit<DbProjectLink, 'id' | 'project_id' | 'created_at'>>): Promise<void> {
    await this.ready();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }

    if (fields.length > 0) {
      values.push(id);
      this.run(`UPDATE project_links SET ${fields.join(', ')} WHERE id = ?`, values);
      this.save();
    }
  }

  async deleteProjectLink(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM project_links WHERE id = ?', [id]);
    this.save();
  }

  // === ISSUE OPERATIONS ===

  async createIssue(data: Omit<DbIssue, 'id' | 'created_at' | 'updated_at'>): Promise<DbIssue> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      `INSERT INTO issues (id, identifier, title, description, status, priority, project_id, parent_id, start_date, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.identifier, data.title, data.description ?? null,
        data.status, data.priority, data.project_id, data.parent_id ?? null,
        data.start_date ?? null, data.due_date ?? null,
        now, now
      ]
    );
    this.save();
    return { id, ...data, created_at: now, updated_at: now };
  }

  async getIssueById(id: string): Promise<DbIssue | null> {
    await this.ready();
    return this.get('SELECT * FROM issues WHERE id = ?', [id]);
  }

  async getIssuesByProject(projectId: string): Promise<DbIssue[]> {
    await this.ready();
    return this.all('SELECT * FROM issues WHERE project_id = ?', [projectId]);
  }

  async getIssuesByTeam(teamId: string): Promise<DbIssue[]> {
    await this.ready();
    return this.all(`
      SELECT i.* FROM issues i
      JOIN projects p ON i.project_id = p.id
      WHERE p.team_id = ?
    `, [teamId]);
  }

  async getAllIssues(): Promise<DbIssue[]> {
    await this.ready();
    return this.all('SELECT * FROM issues');
  }

  async updateIssue(id: string, updates: Partial<Omit<DbIssue, 'id' | 'created_at'>>): Promise<void> {
    await this.ready();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.identifier !== undefined) { fields.push('identifier = ?'); values.push(updates.identifier); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }
    if (updates.project_id !== undefined) { fields.push('project_id = ?'); values.push(updates.project_id); }
    if (updates.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(updates.parent_id); }
    if (updates.start_date !== undefined) { fields.push('start_date = ?'); values.push(updates.start_date); }
    if (updates.due_date !== undefined) { fields.push('due_date = ?'); values.push(updates.due_date); }

    fields.push('updated_at = ?');
    values.push(this.now());
    values.push(id);

    this.run(`UPDATE issues SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  async deleteIssue(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM issues WHERE id = ?', [id]);
    this.save();
  }

  // Issue assignees
  async setIssueAssignees(issueId: string, userIds: string[]): Promise<void> {
    await this.ready();
    this.run('DELETE FROM issue_assignees WHERE issue_id = ?', [issueId]);
    for (const userId of userIds) {
      this.run('INSERT INTO issue_assignees (issue_id, user_id) VALUES (?, ?)', [issueId, userId]);
    }
    this.save();
  }

  async getIssueAssignees(issueId: string): Promise<DbUser[]> {
    await this.ready();
    return this.all(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.created_at, u.updated_at
      FROM users u
      JOIN issue_assignees ia ON u.id = ia.user_id
      WHERE ia.issue_id = ?
    `, [issueId]);
  }

  // Issue dependencies
  async setIssueDependencies(issueId: string, blockingIds: string[]): Promise<void> {
    await this.ready();
    this.run('DELETE FROM issue_dependencies WHERE blocked_id = ?', [issueId]);
    for (const blockingId of blockingIds) {
      this.run('INSERT INTO issue_dependencies (blocked_id, blocking_id) VALUES (?, ?)', [issueId, blockingId]);
    }
    this.save();
  }

  async getIssueDependencies(issueId: string): Promise<DbIssue[]> {
    await this.ready();
    return this.all(`
      SELECT i.* FROM issues i
      JOIN issue_dependencies id ON i.id = id.blocking_id
      WHERE id.blocked_id = ?
    `, [issueId]);
  }

  // === COMMENT OPERATIONS ===

  async createComment(data: Omit<DbComment, 'id' | 'created_at'>): Promise<DbComment> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run('INSERT INTO comments (id, content, issue_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.content, data.issue_id, data.user_id, now]
    );
    this.save();
    return { id, ...data, created_at: now };
  }

  async getCommentsByIssue(issueId: string): Promise<DbComment[]> {
    await this.ready();
    return this.all('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC', [issueId]);
  }

  async deleteComment(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM comments WHERE id = ?', [id]);
    this.save();
  }

  // === NOTIFICATION OPERATIONS ===

  async createNotification(data: Omit<DbNotification, 'id' | 'created_at'>): Promise<DbNotification> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      `INSERT INTO notifications (id, user_id, type, message, issue_id, is_read, actor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.user_id, data.type, data.message, data.issue_id, data.is_read ? 1 : 0, data.actor_id ?? null, now]
    );
    this.save();
    return { id, ...data, is_read: data.is_read ? 1 : 0, created_at: now };
  }

  async getNotificationsByUser(userId: string): Promise<DbNotification[]> {
    await this.ready();
    return this.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async getUnreadNotificationsByUser(userId: string): Promise<DbNotification[]> {
    await this.ready();
    return this.all('SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC', [userId]);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.ready();
    this.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    this.save();
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.ready();
    this.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    this.save();
  }

  async deleteNotification(id: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM notifications WHERE id = ?', [id]);
    this.save();
  }

  // === ACTIVITY OPERATIONS ===

  async createActivity(data: Omit<DbActivity, 'id' | 'created_at'>): Promise<DbActivity> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run(
      `INSERT INTO activities (id, user_id, type, project_id, issue_id, entity_title, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.user_id, data.type, data.project_id ?? null, data.issue_id ?? null, data.entity_title ?? null, data.description ?? null, now]
    );
    this.save();
    return { id, ...data, created_at: now };
  }

  async getActivitiesByUser(userId: string, limit: number = 100): Promise<DbActivity[]> {
    await this.ready();
    return this.all('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  }

  async getActivitiesByProject(projectId: string, limit: number = 100): Promise<DbActivity[]> {
    await this.ready();
    return this.all('SELECT * FROM activities WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [projectId, limit]);
  }

  async getRecentActivities(limit: number = 500): Promise<DbActivity[]> {
    await this.ready();
    return this.all('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', [limit]);
  }

  // === REFRESH TOKEN OPERATIONS ===

  async createRefreshToken(userId: string, token: string, expiresAt: string): Promise<DbRefreshToken> {
    await this.ready();
    const id = this.generateId();
    const now = this.now();
    this.run('INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, token, expiresAt, now]
    );
    this.save();
    return { id, user_id: userId, token, expires_at: expiresAt, created_at: now };
  }

  async getRefreshToken(token: string): Promise<DbRefreshToken | null> {
    await this.ready();
    return this.get('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")', [token]);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    this.save();
  }

  async deleteAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.ready();
    this.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    this.save();
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    await this.ready();
    this.run('DELETE FROM refresh_tokens WHERE expires_at <= datetime("now")');
    this.save();
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null;

export async function getDatabase(): Promise<DatabaseManager> {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH || './linear_clone.db';
    dbInstance = new DatabaseManager(dbPath);
    // Wait for initialization
    await dbInstance.ready();
  }
  return dbInstance;
}

export { DatabaseManager };
