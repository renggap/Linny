/**
 * Team data for seed script
 */

import { generateId, toISOString, randomDateLastDays } from './helpers';

export interface TeamSeed {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface TeamMemberSeed {
  team_id: string;
  user_id: string;
}

/**
 * Generate all team data
 */
export function generateTeams(): TeamSeed[] {
  const teams: TeamSeed[] = [
    {
      id: generateId('team'),
      name: 'Engineering',
      icon: '⚙️',
      created_at: toISOString(randomDateLastDays(90)),
    },
    {
      id: generateId('team'),
      name: 'Design',
      icon: '🎨',
      created_at: toISOString(randomDateLastDays(90)),
    },
    {
      id: generateId('team'),
      name: 'Marketing',
      icon: '📈',
      created_at: toISOString(randomDateLastDays(90)),
    },
  ];

  return teams;
}

/**
 * Get team ID by name
 */
export function getTeamIdByName(teams: TeamSeed[], name: string): string {
  const team = teams.find(t => t.name === name);
  if (!team) throw new Error(`Team not found: ${name}`);
  return team.id;
}

/**
 * Get team identifier by name (ENG, DES, MKT)
 */
export function getTeamIdentifier(teamName: string): string {
  const identifiers: Record<string, string> = {
    'Engineering': 'ENG',
    'Design': 'DES',
    'Marketing': 'MKT',
  };
  return identifiers[teamName] || 'GEN';
}

/**
 * Generate team memberships
 * Maps users to their respective teams based on the design doc
 */
export function generateTeamMembers(
  teams: TeamSeed[],
  userIdsByName: Map<string, string>
): TeamMemberSeed[] {
  const teamIds: Record<string, string> = {
    'Engineering': getTeamIdByName(teams, 'Engineering'),
    'Design': getTeamIdByName(teams, 'Design'),
    'Marketing': getTeamIdByName(teams, 'Marketing'),
  };

  // User assignments by team (from design doc)
  const teamAssignments: Record<string, string[]> = {
    'Engineering': [
      'Budi Santoso',
      'Andi Pratama',
      'Siti Rahayu',
      'Rina Wijaya',
      'Eko Kusumo',
      'Ahmad Hidayat',
    ],
    'Design': [
      'Maya Putri',
      'Dian Permata',
      'Fajar Nugraha',
      'Larasati Dewi',
      'Bambang Sutrisno',
    ],
    'Marketing': [
      'Hendra Gunawan',
      'Linda Kusuma',
      'Dedi Prasetyo',
      'Wulan Sari',
      'Rina Melati',
      'Joko Widodo',
    ],
  };

  const members: TeamMemberSeed[] = [];

  for (const [teamName, userNames] of Object.entries(teamAssignments)) {
    const teamId = teamIds[teamName];
    for (const userName of userNames) {
      const userId = userIdsByName.get(userName);
      if (userId) {
        members.push({ team_id: teamId, user_id: userId });
      }
    }
  }

  return members;
}
