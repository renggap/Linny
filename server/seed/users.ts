/**
 * User data for seed script
 * Indonesian digital agency "Neo Digital"
 */

import { generateId, generateAvatarUrl, toISOString, randomDateLastDays, hashPassword } from './helpers';

export interface UserSeed {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string;
  role: 'Administrator' | 'Team Lead' | 'Member' | 'Guest';
  created_at: string;
  updated_at: string;
}

/**
 * Generate all user data
 */
export async function generateUsers(): Promise<UserSeed[]> {
  // Passwords
  const adminPasswordHash = await hashPassword('Pen16paght!');
  const defaultPasswordHash = await hashPassword('password123');

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const users: UserSeed[] = [
    // ===== ADMIN =====
    {
      id: generateId('usr'),
      name: 'Rengga Putra',
      email: 'rengga@neodigital.co.id',
      password_hash: adminPasswordHash,
      avatar_url: generateAvatarUrl('Rengga Putra'),
      role: 'Administrator',
      created_at: toISOString(threeMonthsAgo),
      updated_at: toISOString(new Date()),
    },

    // ===== TEAM 1: ENGINEERING (⚙️ ENG) =====
    {
      id: generateId('usr'),
      name: 'Budi Santoso',
      email: 'budi.santoso@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Budi Santoso'),
      role: 'Team Lead',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Andi Pratama',
      email: 'andi.pratama@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Andi Pratama'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Siti Rahayu',
      email: 'siti.rahayu@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Siti Rahayu'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Rina Wijaya',
      email: 'rina.wijaya@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Rina Wijaya'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Eko Kusumo',
      email: 'eko.kusumo@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Eko Kusumo'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Ahmad Hidayat',
      email: 'ahmad.hidayat@client.com',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Ahmad Hidayat'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },

    // ===== TEAM 2: DESIGN (🎨 DES) =====
    {
      id: generateId('usr'),
      name: 'Maya Putri',
      email: 'maya.putri@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Maya Putri'),
      role: 'Team Lead',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Dian Permata',
      email: 'dian.permata@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Dian Permata'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Fajar Nugraha',
      email: 'fajar.nugraha@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Fajar Nugraha'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Larasati Dewi',
      email: 'larasati.dewi@freelance.com',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Larasati Dewi'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Bambang Sutrisno',
      email: 'bambang.sutrisno@client.com',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Bambang Sutrisno'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },

    // ===== TEAM 3: MARKETING (📈 MKT) =====
    {
      id: generateId('usr'),
      name: 'Hendra Gunawan',
      email: 'hendra.gunawan@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Hendra Gunawan'),
      role: 'Team Lead',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Linda Kusuma',
      email: 'linda.kusuma@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Linda Kusuma'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Dedi Prasetyo',
      email: 'dedi.prasetyo@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Dedi Prasetyo'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Wulan Sari',
      email: 'wulan.sari@neodigital.co.id',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Wulan Sari'),
      role: 'Member',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Rina Melati',
      email: 'rina.melati@consultant.com',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Rina Melati'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
    {
      id: generateId('usr'),
      name: 'Joko Widodo',
      email: 'joko.widodo@client.com',
      password_hash: defaultPasswordHash,
      avatar_url: generateAvatarUrl('Joko Widodo'),
      role: 'Guest',
      created_at: toISOString(randomDateLastDays(90)),
      updated_at: toISOString(new Date()),
    },
  ];

  return users;
}

/**
 * Get user ID by name (helper for other seed modules)
 */
export function getUserIdByName(users: UserSeed[], name: string): string {
  const user = users.find(u => u.name === name);
  if (!user) throw new Error(`User not found: ${name}`);
  return user.id;
}

/**
 * Get users by role
 */
export function getUsersByRole(users: UserSeed[], role: UserSeed['role']): UserSeed[] {
  return users.filter(u => u.role === role);
}

/**
 * Get team members (Team Leads + Members, exclude Guests/Viewers)
 */
export function getTeamMembers(users: UserSeed[]): UserSeed[] {
  return users.filter(u => u.role === 'Team Lead' || u.role === 'Member');
}

/**
 * Email to name mapping for mention parsing
 */
export function createEmailToNameMap(users: UserSeed[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.email, user.name);
  }
  return map;
}
