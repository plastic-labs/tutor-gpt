import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------- mock setup -------
const mockPeer = { id: 'peer-123', sessions: vi.fn() };
const mockSession = { id: 'session-456', delete: vi.fn() };

const mockHoncho = {
  peer: vi.fn().mockResolvedValue(mockPeer),
  session: vi.fn().mockResolvedValue(mockSession),
};

vi.mock('@honcho-ai/sdk', () => ({
  Honcho: vi.fn().mockImplementation(() => mockHoncho),
}));

// ------- tests -------
describe('Honcho client helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module registry so the caches inside the module are fresh.
    vi.resetModules();
  });

  it('getHonchoPeer returns a peer with correct ID', async () => {
    const { getHonchoPeer } = await import(
      '../../../src/services/honcho/client.js'
    );

    const peer = await getHonchoPeer('user-abc');

    expect(peer).toBeDefined();
    expect(peer.id).toBe('peer-123');
    expect(mockHoncho.peer).toHaveBeenCalledWith('user-abc');
  });

  it('getHonchoPeer caches the result (calling twice only calls honcho.peer once)', async () => {
    const { getHonchoPeer } = await import(
      '../../../src/services/honcho/client.js'
    );

    await getHonchoPeer('user-cached');
    await getHonchoPeer('user-cached');

    expect(mockHoncho.peer).toHaveBeenCalledTimes(1);
  });

  it('getHonchoSession returns a session', async () => {
    const { getHonchoSession } = await import(
      '../../../src/services/honcho/client.js'
    );

    const session = await getHonchoSession('sess-xyz');

    expect(session).toBeDefined();
    expect(session.id).toBe('session-456');
    expect(mockHoncho.session).toHaveBeenCalledWith('sess-xyz');
  });

  it('cache expires after TTL', async () => {
    const { getHonchoPeer } = await import(
      '../../../src/services/honcho/client.js'
    );

    // First call populates the cache
    await getHonchoPeer('user-ttl');
    expect(mockHoncho.peer).toHaveBeenCalledTimes(1);

    // Advance Date.now past the 5-minute TTL
    const realDateNow = Date.now;
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);

    await getHonchoPeer('user-ttl');
    expect(mockHoncho.peer).toHaveBeenCalledTimes(2);

    // Restore Date.now
    Date.now = realDateNow;
  });
});
