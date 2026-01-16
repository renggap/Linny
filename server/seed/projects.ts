/**
 * Project data for seed script
 */

import { generateId, toISOString, randomDateLastDays, slugify } from './helpers';

export interface ProjectSeed {
  id: string;
  name: string;
  identifier: string;
  icon: string;
  team_id: string;
  description: string;
  is_public: number; // 0 or 1 for SQLite
  public_slug: string | null;
  lead_id: string;
  start_date: string;
  target_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate all project data
 */
export function generateProjects(
  teams: { id: string; name: string }[],
  teamLeadIdsByName: Map<string, string>,
  teamIdentifiers: Map<string, string>,
  teamIdsByName: Map<string, string>
): ProjectSeed[] {
  const projects: ProjectSeed[] = [];

  // ===== ENGINEERING PROJECTS =====
  const engTeamId = teamIdsByName.get('Engineering')!;

  // ECO: Website E-Commerce Tokopedia Clone
  projects.push({
    id: generateId('prj'),
    name: 'Website E-Commerce Tokopedia Clone',
    identifier: 'ECO',
    icon: '🛒',
    team_id: engTeamId,
    description: 'Pengembangan platform e-commerce lengkap dengan fitur keranjang belanja, pembayaran online dengan berbagai metode, manajemen produk, katalog, dan sistem review. Frontend menggunakan React dengan TypeScript, backend Node.js dengan Express, dan database PostgreSQL untuk penyimpanan data.',
    is_public: 1,
    public_slug: 'tokopedia-clone',
    lead_id: teamLeadIdsByName.get('Budi Santoso')!,
    start_date: toISOString(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)), // 60 days ago
    target_date: toISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  // MOB: Aplikasi Mobile GoJek
  projects.push({
    id: generateId('prj'),
    name: 'Aplikasi Mobile GoJek',
    identifier: 'MOB',
    icon: '🏍️',
    team_id: engTeamId,
    description: 'Pengembangan super app mobile dengan fitur ojek motor, mobil, delivery makanan, dan pembayaran digital. Menggunakan React Native untuk cross-platform development dengan integrasi Google Maps API, payment gateway, dan real-time tracking dengan WebSocket.',
    is_public: 0,
    public_slug: null,
    lead_id: teamLeadIdsByName.get('Andi Pratama')!,
    start_date: toISOString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
    target_date: toISOString(new Date(Date.now() + 75 * 24 * 60 * 60 * 1000)), // 75 days from now
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  // ===== DESIGN PROJECTS =====
  const desTeamId = teamIdsByName.get('Design')!;

  // TRA: Rebranding Traveloka
  projects.push({
    id: generateId('prj'),
    name: 'Rebranding Traveloka',
    identifier: 'TRA',
    icon: '✈️',
    team_id: desTeamId,
    description: 'Redesign lengkap untuk platform travel termasuk logo baru, palet warna, typography, dan design system komprehensif. Membuat brand guidelines untuk konsistensi visual di semua platform dan marketing materials.',
    is_public: 1,
    public_slug: 'traveloka-rebrand',
    lead_id: teamLeadIdsByName.get('Maya Putri')!,
    start_date: toISOString(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)), // 45 days ago
    target_date: toISOString(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)), // 45 days from now
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  // BNK: UI/UX Aplikasi Banking
  projects.push({
    id: generateId('prj'),
    name: 'UI/UX Aplikasi Banking',
    identifier: 'BNK',
    icon: '🏦',
    team_id: desTeamId,
    description: 'Desain user interface dan user experience untuk aplikasi mobile banking baru dengan fokus pada kemudahan penggunaan, keamanan visual, dan aksesibilitas. Membuat wireframes, mockups, dan prototype untuk user testing.',
    is_public: 0,
    public_slug: null,
    lead_id: teamLeadIdsByName.get('Dian Permata')!,
    start_date: toISOString(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)), // 15 days ago
    target_date: toISOString(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 90 days from now
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  // ===== MARKETING PROJECTS =====
  const mktTeamId = teamIdsByName.get('Marketing')!;

  // STA: Campaign Launch Startup
  projects.push({
    id: generateId('prj'),
    name: 'Campaign Launch Startup',
    identifier: 'STA',
    icon: '🚀',
    team_id: mktTeamId,
    description: 'Campaign marketing lengkap untuk launching startup teknologi baru. Termasuk strategi social media, content marketing, PR outreach, influencer partnership, dan paid advertising di berbagai platform.',
    is_public: 1,
    public_slug: 'startup-launch',
    lead_id: teamLeadIdsByName.get('Hendra Gunawan')!,
    start_date: toISOString(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)), // 20 days ago
    target_date: toISOString(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)), // 15 days from now (urgent!)
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  // SEO: SEO & Content Strategy
  projects.push({
    id: generateId('prj'),
    name: 'SEO & Content Strategy',
    identifier: 'SEO',
    icon: '📊',
    team_id: mktTeamId,
    description: 'Pengembangan strategi SEO dan content marketing untuk meningkatkan organic traffic. Termasuk keyword research, on-page optimization, content calendar, blog strategy, dan link building.',
    is_public: 0,
    public_slug: null,
    lead_id: teamLeadIdsByName.get('Linda Kusuma')!,
    start_date: toISOString(new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)), // 40 days ago
    target_date: toISOString(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)), // 45 days from now
    created_at: toISOString(randomDateLastDays(90)),
    updated_at: toISOString(new Date()),
  });

  return projects;
}

/**
 * Get project ID by identifier (ENG-1, DES-1, etc.)
 */
export function getProjectByIdentifier(projects: ProjectSeed[], identifier: string): ProjectSeed | undefined {
  return projects.find(p => p.identifier === identifier);
}

/**
 * Get projects by team ID
 */
export function getProjectsByTeam(projects: ProjectSeed[], teamId: string): ProjectSeed[] {
  return projects.filter(p => p.team_id === teamId);
}

/**
 * Get next issue number for a project
 */
export function getNextIssueNumber(projectIdentifier: string): string {
  // This will be incremented during issue generation
  return '1';
}
