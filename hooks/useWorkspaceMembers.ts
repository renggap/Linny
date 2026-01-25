import { useMemo } from 'react';
import { Team, User, UserRole } from '../types';

/**
 * Hook to get workspace (team) members with proper filtering and sorting.
 * Provides a single source of truth for workspace member lists across the app.
 *
 * @param currentTeam - The current team/workspace
 * @param allUsers - All users in the system
 * @returns Filtered and sorted workspace members
 */
export function useWorkspaceMembers(currentTeam: Team | undefined, allUsers: User[]): User[] {
  return useMemo(() => {
    if (!currentTeam) return [];

    // Get team member IDs
    const memberIds = currentTeam.members || [];

    // Filter users by team membership
    const members = allUsers.filter(user => memberIds.includes(user.id));

    // Sort by role priority (Administrator -> Team Lead -> Member -> Guest)
    const rolePriority: Record<UserRole, number> = {
      [UserRole.Administrator]: 0,
      [UserRole.TeamLead]: 1,
      [UserRole.Member]: 2,
      [UserRole.Guest]: 3
    };

    return members.sort((a, b) => {
      const priorityA = rolePriority[a.role] ?? 999;
      const priorityB = rolePriority[b.role] ?? 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // If same role, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [currentTeam, allUsers]);
}

/**
 * Extended version that also provides team-specific roles.
 * Useful when you need both the user info and their role within the team.
 *
 * @param currentTeam - The current team/workspace
 * @param allUsers - All users in the system
 * @returns Filtered and sorted workspace members with their team-specific roles
 */
export function useWorkspaceMembersWithRoles(
  currentTeam: Team | undefined,
  allUsers: User[]
): Array<{ user: User; teamRole: UserRole }> {
  return useMemo(() => {
    if (!currentTeam) return [];

    // Get team member IDs
    const memberIds = currentTeam.members || [];
    const membersWithRoles = currentTeam.membersWithRoles || [];

    // Create a map of user IDs to team-specific roles
    const roleMap = new Map<string, UserRole>(
      membersWithRoles.map(mwr => [mwr.id, mwr.role])
    );

    // Filter and map users
    const members = allUsers
      .filter(user => memberIds.includes(user.id))
      .map(user => ({
        user,
        teamRole: roleMap.get(user.id) ?? user.role
      }));

    // Sort by team-specific role priority (Administrator -> Team Lead -> Member -> Guest)
    const rolePriority: Record<UserRole, number> = {
      [UserRole.Administrator]: 0,
      [UserRole.TeamLead]: 1,
      [UserRole.Member]: 2,
      [UserRole.Guest]: 3
    };

    return members.sort((a, b) => {
      const priorityA = rolePriority[a.teamRole] ?? 999;
      const priorityB = rolePriority[b.teamRole] ?? 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.user.name.localeCompare(b.user.name);
    });
  }, [currentTeam, allUsers]);
}
