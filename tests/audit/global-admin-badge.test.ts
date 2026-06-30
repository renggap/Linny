import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const sidebarSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/Sidebar.tsx'),
  'utf8'
);

describe('Sidebar shows global-admin Shield badge independent of team role', () => {
  // After fixing the crown to reflect team-scoped role, global admins who
  // were team Members lost their visual distinction. The Shield badge
  // restores that signal — it's based on isGlobalAdministrator() and
  // appears alongside (not instead of) the team role badge.

  it('Sidebar imports Shield from lucide-react', () => {
    const importBlock = sidebarSrc.match(/import \{[\s\S]*?\} from 'lucide-react'/)?.[0] ?? '';
    expect(importBlock).toMatch(/\bShield\b/);
  });

  it('Sidebar renders Shield when isGlobalAdministrator(user) is true', () => {
    expect(sidebarSrc).toMatch(/isGlobalAdministrator\(user\)/);
    expect(sidebarSrc).toMatch(/<Shield className="w-2\.5 h-2\.5"/);
  });

  it('Shield badge has a tooltip explaining the global-admin role', () => {
    expect(sidebarSrc).toMatch(/Global Administrator/i);
  });

  it('Shield and team-role badge stack side-by-side (both render independently)', () => {
    // The rightElement wrapper contains both the Shield span and the team
    // role span. They should be siblings, not alternatives.
    const wrapper = sidebarSrc.match(/rightElement=\{\s*<span className="flex items-center gap-1">[\s\S]*?<\/span>\s*\}/)?.[0] ?? '';
    expect(wrapper).toMatch(/isGlobalAdmin &&/);
    expect(wrapper).toMatch(/<Shield/);
    // Team role badge is still present alongside
    expect(wrapper).toMatch(/roleStyle\.bg/);
  });
});
