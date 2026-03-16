import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Critical Fixes Verification', () => {
  it('should have vitest config', () => {
    expect(fs.existsSync(path.resolve('vitest.config.ts'))).toBe(true);
  });

  it('should have no hardcoded secrets in docker-compose.yml', () => {
    const content = fs.readFileSync('docker-compose.yml', 'utf-8');
    const hasHardcodedPostgres = /POSTGRES_PASSWORD:\s*[a-zA-Z0-9]{20,}/.test(content);
    const hasHardcodedRedis = /REDIS_PASSWORD:\s*[a-zA-Z0-9]{20,}/.test(content);
    expect(hasHardcodedPostgres).toBe(false);
    expect(hasHardcodedRedis).toBe(false);
    expect(content).toContain('${POSTGRES_PASSWORD}');
    expect(content).toContain('${REDIS_PASSWORD}');
  });

  it('should have limited console.log in services/api.ts', () => {
    const content = fs.readFileSync('services/api.ts', 'utf-8');
    const consoleLogCount = (content.match(/console\.log\(/g) || []).length;
    expect(consoleLogCount).toBeLessThan(10);
  });

  it('should have .env file with secrets', () => {
    expect(fs.existsSync('.env')).toBe(true);
    const envContent = fs.readFileSync('.env', 'utf-8');
    expect(envContent).toMatch(/POSTGRES_PASSWORD=/);
    expect(envContent).toMatch(/REDIS_PASSWORD=/);
    expect(envContent).toMatch(/JWT_SECRET=/);
  });

  it('should have tests directory', () => {
    expect(fs.existsSync('tests')).toBe(true);
  });
});
