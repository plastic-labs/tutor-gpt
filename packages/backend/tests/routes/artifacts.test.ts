import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------- mock Elysia -------
type Handler = (ctx: any) => any;

function createMockElysia() {
  const routes: Record<string, { handler: Handler }> = {};
  let derivedCtx: Record<string, unknown> = {};

  const instance = {
    _routes: routes,
    use: vi.fn().mockReturnThis(),
    derive: vi.fn((_opts: any, fn: any) => {
      const prev = derivedCtx;
      derivedCtx = { ...prev, ...(typeof fn === 'function' ? fn({}) : {}) };
      return instance;
    }),
    get: vi.fn((path: string, handler: Handler) => {
      routes[`GET ${path}`] = { handler };
      return instance;
    }),
    post: vi.fn((path: string, handler: Handler) => {
      routes[`POST ${path}`] = { handler };
      return instance;
    }),
    put: vi.fn((path: string, handler: Handler) => {
      routes[`PUT ${path}`] = { handler };
      return instance;
    }),
    delete: vi.fn((path: string, handler: Handler) => {
      routes[`DELETE ${path}`] = { handler };
      return instance;
    }),
    patch: vi.fn((path: string, handler: Handler) => {
      routes[`PATCH ${path}`] = { handler };
      return instance;
    }),
    async handle(request: Request) {
      const url = new URL(request.url);
      const method = request.method;
      let matchKey = `${method} ${url.pathname}`;
      let params: Record<string, string> = {};

      if (!routes[matchKey]) {
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
      const result = await route.handler(ctx);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };

  return instance;
}

vi.mock('elysia', () => ({
  Elysia: vi.fn().mockImplementation(() => createMockElysia()),
  t: {
    Object: vi.fn((schema: any) => schema),
    String: vi.fn(() => 'string'),
    Optional: vi.fn((s: any) => s),
    Union: vi.fn((arr: any) => arr),
    Literal: vi.fn((v: any) => v),
  },
}));

// ------- mock data -------
const mockArtifactRow = {
  id: 'art-1',
  title: 'My Artifact',
  content_type: 'text/markdown',
  current_version: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_id: 'test-user',
  storage_path: 'test-user/abc',
};

const mockUpload = vi.fn().mockResolvedValue({ error: null });

// Build a supabase-style chainable query mock
function createChainableSelect(data: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue({ data });
  chain.single = vi.fn().mockReturnValue({ data: data?.[0] ?? data, error: null });
  return chain;
}

function createChainableInsert(data: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  return chain;
}

vi.mock('../../src/services/supabase/admin.js', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'artifacts') {
        return {
          select: vi.fn().mockReturnValue(createChainableSelect([mockArtifactRow])),
          insert: vi.fn().mockReturnValue(createChainableInsert(mockArtifactRow)),
        };
      }
      if (table === 'artifact_versions') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
      }),
    },
  },
}));

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: {},
}));

// ------- tests -------
describe('artifactRoutes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-register mocks after resetModules
    vi.doMock('elysia', () => ({
      Elysia: vi.fn().mockImplementation(() => createMockElysia()),
      t: {
        Object: vi.fn((schema: any) => schema),
        String: vi.fn(() => 'string'),
        Optional: vi.fn((s: any) => s),
        Union: vi.fn((arr: any) => arr),
        Literal: vi.fn((v: any) => v),
      },
    }));

    vi.doMock('../../src/services/supabase/admin.js', () => ({
      supabaseAdmin: {
        from: vi.fn((table: string) => {
          if (table === 'artifacts') {
            return {
              select: vi.fn().mockReturnValue(createChainableSelect([mockArtifactRow])),
              insert: vi.fn().mockReturnValue(createChainableInsert(mockArtifactRow)),
            };
          }
          if (table === 'artifact_versions') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockUpload,
          }),
        },
      },
    }));

    vi.doMock('../../src/middleware/auth.js', () => ({
      authMiddleware: {},
    }));

    const mod = await import('../../src/routes/artifacts.js');
    app = mod.artifactRoutes;
  });

  it('GET /artifacts returns mapped artifact list', async () => {
    const response = await app.handle(
      new Request('http://localhost/')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toEqual({
      id: 'art-1',
      title: 'My Artifact',
      contentType: 'text/markdown',
      currentVersion: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
  });

  it('POST /artifacts creates artifact with storage upload', async () => {
    const response = await app.handle(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Artifact',
          content: '# Hello World',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title');
    // Storage upload should have been called (v1.md and current.md)
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });
});
