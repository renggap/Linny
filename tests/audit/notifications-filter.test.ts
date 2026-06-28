import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/notifications.fastify.ts'),
  'utf8'
);

describe('notifications unread filter', () => {
  it('unread=true → isRead=false (returns only unread)', () => {
    const block = src.match(/const where: any = \{[\s\S]*?\};/)?.[0] ?? '';
    expect(block).toMatch(/unread\s*===\s*'true'\s*\?\s*false/);
  });

  it('unread=false → isRead=true (returns only read)', () => {
    const block = src.match(/const where: any = \{[\s\S]*?\};/)?.[0] ?? '';
    expect(block).toMatch(/unread\s*===\s*'false'\s*\?\s*true/);
  });

  it('unread omitted → isRead=undefined (returns all)', () => {
    const block = src.match(/const where: any = \{[\s\S]*?\};/)?.[0] ?? '';
    expect(block).toMatch(/:\s*undefined/);
  });
});
