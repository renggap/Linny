import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const schemaSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/prisma/schema.prisma'),
  'utf8'
);
const projectsRouteSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/projects.fastify.ts'),
  'utf8'
);
const mainViewSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/MainView.tsx'),
  'utf8'
);
const headerSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/Header.tsx'),
  'utf8'
);

describe('project identifier uniqueness', () => {
  it('schema declares @@unique([teamId, identifier])', () => {
    // DB-level enforcement is the safety net — application-level checks can
    // race. Constraint is scoped per-team so different teams can reuse
    // identifiers (e.g., ENG in team A and team B is fine).
    const projectBlock = schemaSrc.match(/model Project \{[\s\S]*?^\}/m)?.[0] ?? '';
    expect(projectBlock).toMatch(/@@unique\(\[teamId,\s*identifier\]\)/);
  });

  it('POST / rejects duplicate identifier with 409 (friendly error)', () => {
    // Without pre-check, Prisma throws P2002 which becomes a 500.
    // Pre-check returns 409 with field-level detail the frontend can surface.
    const postHandler = projectsRouteSrc.match(/fastify\.post\('\/'[\s\S]*?reply\.code\(201\)/)?.[0] ?? '';
    expect(postHandler).toMatch(/teamId_identifier/);
    expect(postHandler).toMatch(/409/);
    expect(postHandler).toMatch(/Identifier already in use/);
  });

  it('PATCH /:id rejects identifier clash with 409', () => {
    const patchHandler = projectsRouteSrc.match(/fastify\.patch\('\/:id'[\s\S]*?return \{ project \};\s*\}\);/)?.[0] ?? '';
    expect(patchHandler).toMatch(/teamId_identifier/);
    expect(patchHandler).toMatch(/409/);
  });
});

describe('project overview drawer placement (topbar popover)', () => {
  it('MainView no longer reserves vertical space for ProjectOverviewHeader', () => {
    // The pt-6 shrink-0 wrapper used to eat ~80px even when collapsed.
    expect(mainViewSrc).not.toMatch(/shrink-0 pt-6[\s\S]*ProjectOverviewHeader/);
    expect(mainViewSrc).not.toMatch(/<ProjectOverviewHeader/);
  });

  it('Header renders ProjectOverviewHeader as absolute-positioned popover', () => {
    expect(headerSrc).toMatch(/import \{ ProjectOverviewHeader \}/);
    expect(headerSrc).toMatch(/isProjectOverviewExpanded/);
    // Popover container must be absolute + z-40 to overlay main content
    expect(headerSrc).toMatch(/absolute top-full[\s\S]*z-40/);
  });

  it('Header closes popover on outside-click via mousedown listener', () => {
    expect(headerSrc).toMatch(/projectOverviewRef/);
    expect(headerSrc).toMatch(/addEventListener\(['"]mousedown['"]/);
  });

  it('ProjectOverviewHeader does not clip expanding content (no overflow-hidden)', () => {
    // Bug: previously the outer motion.div had overflow-hidden, which clipped
    // the add-resource form during the height animation. Popover mode doesn't
    // need overflow-hidden since sharp corners are radius-0 by design.
    const overviewSrc = fs.readFileSync(
      path.resolve(__dirname, '../../components/ProjectOverviewHeader.tsx'),
      'utf8'
    );
    const outerDiv = overviewSrc.match(/<motion\.div[\s\S]*?layout[\s\S]*?shadow-popover[\s\S]*?>/)?.[0] ?? '';
    expect(outerDiv).not.toMatch(/overflow-hidden/);

    // Inner expandable motion.div also must not have overflow-hidden
    const innerDiv = overviewSrc.match(/isExpanded && \([\s\S]*?<motion\.div[\s\S]*?>/)?.[0] ?? '';
    expect(innerDiv).not.toMatch(/overflow-hidden/);
  });

  it('Public View button is in Header (topbar), not in ProjectOverviewHeader', () => {
    const overviewSrc = fs.readFileSync(
      path.resolve(__dirname, '../../components/ProjectOverviewHeader.tsx'),
      'utf8'
    );
    expect(overviewSrc).not.toMatch(/Public View/);

    // Header must render the Public View link when project has publicSlug
    expect(headerSrc).toMatch(/currentProject\?\.isPublic/);
    expect(headerSrc).toMatch(/publicSlug/);
    expect(headerSrc).toMatch(/Public View/);
  });
});
