import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as handleToken } from '../src/app/api/autopilot/token/route';
import { getServerSession } from 'next-auth/next';
import { db } from '../src/lib/db';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('API: /api/autopilot/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 Unauthorized when session is absent', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await handleToken();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('generates a valid autopilot token for developer email even when userId is unlinked', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'oauth_user_roushan_123',
        email: 'playboxstation460@gmail.com',
        name: 'Roushan Kumar',
      },
      expires: '2099-01-01',
    });

    const res = await handleToken();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.token.length).toBeGreaterThan(10);
  });

  it('generates a valid autopilot token for Ayushi developer email', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'oauth_user_ayushi_456',
        email: 'ayushi29507@gmail.com',
        name: 'Ayushi Raj',
      },
      expires: '2099-01-01',
    });

    const res = await handleToken();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
  });
});

