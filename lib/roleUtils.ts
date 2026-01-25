import { User, Team, UserRole } from '../types';

/**
 * Get the effective role for a user in a team context.
 * - Administrator is a global role and takes precedence over team-specific roles
 * - TeamLead, Member, Guest are team-scoped roles
 *
 * @param user - The user to get the role for
 * @param team - The team to get the role in (undefined = global context)
 * @returns The effective role for the user in the given team context
 */
export function getEffectiveRole(user: User | null | undefined, team: Team | null | undefined): UserRole {
  if (!user) return UserRole.Guest;

  // Administrator is a global role - takes precedence over team-specific roles
  if (user.role === UserRole.Administrator) return UserRole.Administrator;

  // For non-administrators, check team-specific role
  if (team?.membersWithRoles) {
    const memberWithRole = team.membersWithRoles.find(m => m.id === user.id);
    if (memberWithRole) {
      return memberWithRole.role;
    }
  }

  // Check if user is a member of the team (fallback to Member)
  if (team && user.role === UserRole.Member) {
    return UserRole.Member;
  }

  // Default to the user's global role
  return user.role;
}

/**
 * Check if a user can create content in a team context.
 * Administrators and TeamLeads can always create content.
 * Members can create content.
 * Guests cannot create content.
 *
 * @param user - The user to check
 * @param team - The team to check in (undefined = global context)
 * @returns True if the user can create content
 */
export function canCreateContent(user: User | null | undefined, team: Team | null | undefined): boolean {
  const effectiveRole = getEffectiveRole(user, team);
  return effectiveRole !== UserRole.Guest;
}

/**
 * Check if a user can manage a team (Administrator or TeamLead).
 *
 * @param user - The user to check
 * @param team - The team to check in (undefined = global context)
 * @returns True if the user can manage the team
 */
export function canManageTeam(user: User | null | undefined, team: Team | null | undefined): boolean {
  const effectiveRole = getEffectiveRole(user, team);
  return effectiveRole === UserRole.Administrator || effectiveRole === UserRole.TeamLead;
}

/**
 * Check if a user is a global Administrator.
 *
 * @param user - The user to check
 * @returns True if the user is a global Administrator
 */
export function isGlobalAdministrator(user: User | null | undefined): boolean {
  return user?.role === UserRole.Administrator;
}
