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

  it('POST / auto-generates a unique identifier when requested one clashes', () => {
    // Bug: previously returned 409 with a Prisma-flavored error message.
    // User intent: keep creation frictionless — walk variations until unique.
    // Verify on the whole file (no need to slice precisely).
    expect(projectsRouteSrc).toMatch(/resolveUniqueIdentifier/);
    expect(projectsRouteSrc).toMatch(/identifierChanged:\s*finalIdentifier\s*!==\s*data\.identifier/);
    // POST handler must NOT return 409 anymore (only PATCH can).
    const postHandlerStart = projectsRouteSrc.indexOf("fastify.post('/',");
    const patchHandlerStart = projectsRouteSrc.indexOf("fastify.patch('/:id',");
    const postHandler = postHandlerStart >= 0 && patchHandlerStart > postHandlerStart
      ? projectsRouteSrc.slice(postHandlerStart, patchHandlerStart)
      : '';
    expect(postHandler.length).toBeGreaterThan(0);
    expect(postHandler).not.toMatch(/reply\.code\(409\)/);
  });

  it('POST + PATCH check identifier uniqueness case-insensitively', () => {
    // Bug: legacy 'api' (lowercase) coexisted with 'API' (uppercase) in same
    // team because Postgres text comparison is case-sensitive by default.
    // Validation regex now forces uppercase on new requests, but legacy data
    // and any future lowercase leakage must still be caught via case-insensitive
    // lookup (mode: 'insensitive').
    expect(projectsRouteSrc).toMatch(/mode:\s*['"]insensitive['"]/);
    // POST handler must normalize the requested identifier to uppercase before lookup
    expect(projectsRouteSrc).toMatch(/requestedUpper\s*=\s*requested\.toUpperCase\(\)/);
    // PATCH handler must normalize updates.identifier too
    expect(projectsRouteSrc).toMatch(/updates\.identifier\s*=\s*requestedUpper/);
  });

  it('PATCH /:id rejects identifier clash with 409 (case-insensitive)', () => {
    const patchHandler = projectsRouteSrc.match(/fastify\.patch\('\/:id'[\s\S]*?return \{ project \};\s*\}\);/)?.[0] ?? '';
    expect(patchHandler).toMatch(/409/);
    // Case-insensitive lookup (no longer uses teamId_identifier compound key)
    expect(patchHandler).toMatch(/mode:\s*['"]insensitive['"]/);
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

  it('Header renders popover as sibling of title (not nested inside truncate)', () => {
    // Bug: the popover was nested inside <div className="... truncate"> which
    // applies overflow:hidden and clips absolute-positioned descendants.
    // Fix: lift popover to be a sibling of the breadcrumb row, directly
    // under <header> (no truncate ancestor).
    const headerSrcFresh = fs.readFileSync(
      path.resolve(__dirname, '../../components/Header.tsx'),
      'utf8'
    );
    // Find the popover block (with projectOverviewRef) and capture ~200 chars before it.
    const popoverIdx = headerSrcFresh.indexOf('ref={projectOverviewRef}');
    expect(popoverIdx).toBeGreaterThan(-1);
    const preceding = headerSrcFresh.slice(Math.max(0, popoverIdx - 300), popoverIdx);
    // The preceding context should include the title row's CLOSING tags (the
    // breadcrumb div and its parent should be closed before the popover opens).
    expect(preceding).toMatch(/<\/div>\s*<\/div>/);
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
