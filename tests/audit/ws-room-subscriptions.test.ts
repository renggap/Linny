import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../hooks/useWebSocket.ts'),
  'utf8'
);

describe('WebSocket room subscriptions', () => {
  it('subscribes to join-requests room when authenticated', () => {
    expect(src).toMatch(/subscribe\(['"]join-requests['"]\)/);
    expect(src).toMatch(/unsubscribe\(['"]join-requests['"]\)/);
  });

  it('subscribes to project room when a project is selected', () => {
    expect(src).toMatch(/subscribe\(`project:\$\{/);
    expect(src).toMatch(/unsubscribe\(`project:\$\{/);
  });

  it('reads selectedProjectId from the UI store', () => {
    expect(src).toMatch(/selectedProjectId/);
  });

  it('cleans up project subscription on unmount', () => {
    // The useEffect should return a cleanup that unsubscribes
    const block = src.match(/useEffect\([^}]*selectedProjectId[\s\S]*?\},\s*\[[^\]]*\]\s*\);/m)?.[0] ?? '';
    expect(block).toMatch(/return\s*\(\)\s*=>/);
    expect(block).toMatch(/unsubscribe/);
  });
});
