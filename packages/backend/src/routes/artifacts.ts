import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../services/supabase/admin.js';

export const artifactRoutes = new Elysia({ prefix: '/artifacts' })
  .use(authMiddleware)
  .get('/', async ({ userId }) => {
    const { data } = await supabaseAdmin
      .from('artifacts')
      .select('id, title, content_type, current_version, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      contentType: a.content_type,
      currentVersion: a.current_version,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  })
  .post(
    '/',
    async ({ body, userId }) => {
      const storagePath = `${userId}/${crypto.randomUUID()}`;

      // Upload to storage
      await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${storagePath}/v1.md`, new Blob([body.content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${storagePath}/current.md`, new Blob([body.content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      const { data: artifact, error } = await supabaseAdmin
        .from('artifacts')
        .insert({
          user_id: userId,
          title: body.title,
          content_type: body.contentType ?? 'text/markdown',
          current_version: 1,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) throw new Error(`Artifact creation failed: ${error.message}`);

      await supabaseAdmin.from('artifact_versions').insert({
        artifact_id: artifact.id,
        version: 1,
        storage_path: `${storagePath}/v1.md`,
        change_summary: 'Initial version',
      });

      return {
        id: artifact.id,
        title: artifact.title,
        contentType: artifact.content_type,
        currentVersion: 1,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
      };
    },
    {
      body: t.Object({
        title: t.String(),
        content: t.String(),
        contentType: t.Optional(
          t.Union([
            t.Literal('text/markdown'),
            t.Literal('text/plain'),
            t.Literal('application/json'),
          ])
        ),
      }),
    }
  )
  .get(
    '/:id/versions',
    async ({ params, userId }) => {
      // Verify ownership
      const { data: artifact } = await supabaseAdmin
        .from('artifacts')
        .select('id')
        .eq('id', params.id)
        .eq('user_id', userId)
        .single();

      if (!artifact) throw new Error('Artifact not found');

      const { data: versions } = await supabaseAdmin
        .from('artifact_versions')
        .select('*')
        .eq('artifact_id', params.id)
        .order('version', { ascending: false });

      return (versions ?? []).map((v) => ({
        id: v.id,
        version: v.version,
        changeSummary: v.change_summary,
        createdAt: v.created_at,
      }));
    },
    { params: t.Object({ id: t.String() }) }
  )
  .put(
    '/:id',
    async ({ params, body, userId }) => {
      const { data: artifact, error } = await supabaseAdmin
        .from('artifacts')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', userId)
        .single();

      if (error || !artifact) throw new Error('Artifact not found');

      const newVersion = artifact.current_version + 1;
      const versionPath = `${artifact.storage_path}/v${newVersion}.md`;

      await supabaseAdmin.storage
        .from('artifacts')
        .upload(versionPath, new Blob([body.content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${artifact.storage_path}/current.md`, new Blob([body.content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      await supabaseAdmin
        .from('artifacts')
        .update({
          current_version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      await supabaseAdmin.from('artifact_versions').insert({
        artifact_id: params.id,
        version: newVersion,
        storage_path: versionPath,
        change_summary: body.changeSummary ?? null,
      });

      return { id: params.id, version: newVersion };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.String(),
        changeSummary: t.Optional(t.String()),
      }),
    }
  );
