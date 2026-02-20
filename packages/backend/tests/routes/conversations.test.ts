import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------- mock Elysia -------
// Elysia cannot be loaded directly due to a typebox version mismatch in this
// environment, so we create a lightweight mock that records route handlers
// and provides a `.handle()` method for testing.

type Handler = (ctx: any) => any;

function createMockElysia() {
  const routes: Record<string, Record<string, Handler>> = {};
  let derivedCtx: Record<string, unknown> = {};

  const instance = {
    _routes: routes,
    use: vi.fn().mockReturnThis(),
    derive: vi.fn((_opts: any, fn: any) => {
      // capture derive context
      const prev = derivedCtx;
      derivedCtx = { ...prev, ...(typeof fn === 'function' ? fn({}) : {}) };
      return instance;
    }),
    get: vi.fn((path: string, handler: Handler) => {
      routes[`GET ${path}`] = { handler } as any;
      return instance;
    }),
    post: vi.fn((path: string, handler: Handler) => {
      routes[`POST ${path}`] = { handler } as any;
      return instance;
    }),
    delete: vi.fn((path: string, handler: Handler) => {
      routes[`DELETE ${path}`] = { handler } as any;
      return instance;
    }),
    patch: vi.fn((path: string, handler: Handler) => {
      routes[`PATCH ${path}`] = { handler } as any;
      return instance;
    }),
    async handle(request: Request) {
      const url = new URL(request.url);
      const method = request.method;

      // Try exact match first, then pattern match for /:id routes
      let matchKey = `${method} ${url.pathname}`;
      let params: Record<string, string> = {};

      if (!routes[matchKey]) {
        // Try matching /:id patterns
        for (const key of Object.keys(routes)) {
          const [rMethod, rPath] = key.split(' ');
          if (rMethod !== method) continue;
          const routeParts = rPath.split('/');
          const urlParts = url.pathname.split('/');
          if (routeParts.length !== urlParts.length) continue;

          let match = true;
          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              params[routeParts[i].slice(1)] = urlParts[i];
            } else if (routeParts[i] !== urlParts[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            matchKey = key;
            break;
          }
        }
      }

      const route = routes[matchKey];
      if (!route) {
        return new Response('Not found', { status: 404 });
      }

      let body: any;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          body = await request.json();
        } catch {
          body = undefined;
        }
      }

      const ctx = { ...derivedCtx, userId: 'test-user', params, body, request };
      const result = await (route as any).handler(ctx);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };

  return instance;
}

vi.mock('elysia', () => {
  return {
    Elysia: vi.fn().mockImplementation(() => createMockElysia()),
    t: {
      Object: vi.fn((schema: any) => schema),
      String: vi.fn(() => 'string'),
      Optional: vi.fn((s: any) => s),
    },
  };
});

// ------- mock honcho client -------
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockAddPeers = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/services/honcho/client.js', () => ({
  honcho: {
    session: vi.fn().mockResolvedValue({
      id: 'new-session-id',
      delete: mockDelete,
      addPeers: mockAddPeers,
      metadata: {},
    }),
  },
  getHonchoPeer: vi.fn().mockResolvedValue({
    id: 'peer-id',
    sessions: vi.fn().mockResolvedValue({ items: [] }),
  }),
  getHonchoSession: vi.fn().mockResolvedValue({
    id: 'session-to-delete',
    delete: mockDelete,
    metadata: {},
  }),
}));

// Mock auth middleware -- the mock Elysia's .use() is a no-op, and userId is
// injected directly into the handler context above.
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: {},
}));

// ------- tests -------
describe('conversationRoutes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get a fresh route setup
    vi.resetModules();

    // Re-register elysia mock after resetModules
    vi.doMock('elysia', () => ({
      Elysia: vi.fn().mockImplementation(() => createMockElysia()),
      t: {
        Object: vi.fn((schema: any) => schema),
        String: vi.fn(() => 'string'),
        Optional: vi.fn((s: any) => s),
      },
    }));

    vi.doMock('../../src/services/honcho/client.js', () => ({
      honcho: {
        session: vi.fn().mockResolvedValue({
          id: 'new-session-id',
          delete: mockDelete,
          addPeers: mockAddPeers,
          metadata: {},
        }),
      },
      getHonchoPeer: vi.fn().mockResolvedValue({
        id: 'peer-id',
        sessions: vi.fn().mockResolvedValue({ items: [] }),
      }),
      getHonchoSession: vi.fn().mockResolvedValue({
        id: 'session-to-delete',
        delete: mockDelete,
        metadata: {},
      }),
    }));

    vi.doMock('../../src/middleware/auth.js', () => ({
      authMiddleware: {},
    }));

    const mod = await import('../../src/routes/conversations.js');
    app = mod.conversationRoutes;
  });

  it('GET /conversations returns empty array when no sessions', async () => {
    const response = await app.handle(
      new Request('http://localhost/')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('POST /conversations creates a new conversation', async () => {
    const response = await app.handle(
      new Request('http://localhost/', { method: 'POST' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('conversationId');
    expect(body).toHaveProperty('name', 'Untitled');
  });

  it('DELETE /conversations/:id calls session.delete()', async () => {
    const response = await app.handle(
      new Request('http://localhost/some-session-id', {
        method: 'DELETE',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
  });
});
