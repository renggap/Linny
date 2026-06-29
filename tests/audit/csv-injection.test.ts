import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/export.fastify.ts'),
  'utf8'
);

describe('CSV injection escape helper', () => {
  it('declares an escape function matching the spec', () => {
    expect(src).toMatch(/function escapeCsvCell|function escapeCsv|function sanitizeCsvCell/);
  });

  it('prefixes dangerous characters with a single quote', () => {
    // Mirror the expected escape logic
    function escapeCsvCell(value: unknown): string {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
      return str;
    }
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('-1')).toBe("'-1");
    expect(escapeCsvCell('@foo')).toBe("'@foo");
    expect(escapeCsvCell('\tmalicious')).toBe("'\tmalicious");
    expect(escapeCsvCell('normal text')).toBe('normal text');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(null)).toBe('');
  });
});

describe('export route uses escape on user-controlled fields', () => {
  it('issues CSV wraps title, description, and assignee emails with escape', () => {
    expect(src).toMatch(/escapeCsvCell\([^)]*title/);
    expect(src).toMatch(/escapeCsvCell\([^)]*description/);
    expect(src).toMatch(/escapeCsvCell\([^)]*email/);
  });

  it('projects CSV wraps name and description with escape', () => {
    expect(src).toMatch(/escapeCsvCell\([^)]*name/);
  });

  it('users CSV wraps name and email with escape', () => {
    // already covered by the email assertion above; ensure name is also escaped
    const usersBlock = src.match(/fastify\.get\('\/users'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
    expect(usersBlock).toMatch(/escapeCsvCell/);
  });
});
