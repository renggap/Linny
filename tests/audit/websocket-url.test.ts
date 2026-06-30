import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const wsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../services/websocket.ts'),
  'utf8'
);
const authSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/Auth.tsx'),
  'utf8'
);
const wsServerSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/websocket/fastifyWebSocketRoutes.ts'),
  'utf8'
);

describe('production URL fallback (no hardcoded localhost)', () => {
  it('websocket.ts does NOT hardcode ws://localhost:3001 fallback', () => {
    expect(wsSrc).not.toMatch(/'http:\/\/localhost:3001'/);
  });

  it('websocket.ts derives apiUrl from window.location.origin when no VITE_API_URL', () => {
    expect(wsSrc).toMatch(/window\.location\.origin/);
  });

  it('Auth.tsx invitation accept does not hardcode localhost fallback', () => {
    expect(authSrc).not.toMatch(/'http:\/\/localhost:3001'\/api\/v1\/invitations\/accept/);
  });
});

describe('join-requests WebSocket route', () => {
  it('frontend maps join-requests room to /ws/join-requests (no path param)', () => {
    const fnBlock = wsSrc.match(/private getRoomUrl[\s\S]*?^\s{4}\}/m)?.[0] ?? '';
    expect(fnBlock).toMatch(/noParamRooms/);
    expect(fnBlock).toMatch(/'user',\s*'join-requests'/);
  });

  it('backend exposes /ws/join-requests route', () => {
    expect(wsServerSrc).toMatch(/fastify\.get\(['"]\/ws\/join-requests['"]/);
    expect(wsServerSrc).toMatch(/const roomId = ['"]join-requests['"]/);
  });

  it('frontend gates join-requests subscription on isGlobalAdministrator', () => {
    // Security: route broadcasts to a global room with no team filter, so
    // subscribing non-admins would leak applicant PII across teams.
    const useWsSrc = fs.readFileSync(
      path.resolve(__dirname, '../../hooks/useWebSocket.ts'),
      'utf8'
    );
    expect(useWsSrc).toMatch(/isGlobalAdministrator/);
    // The subscribe('join-requests') call must be inside a role-gated branch.
    expect(useWsSrc).toMatch(/canSeeJoinRequests\s*=\s*isGlobalAdministrator/);
  });

  it('backend rejects non-admin connections to /ws/join-requests', () => {
    // Defense in depth: frontend gate can be bypassed by crafted WS upgrade.
    expect(wsServerSrc).toMatch(/ws\.userRole !== ['"]Administrator['"]/);
  });
});
