import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabase/admin.js';

export function artifactCreateTool(userId: string) {
  return tool({
    description:
      'Create a new document artifact for the student. Use when the student asks you to help write an essay, code, notes, or any structured document.',
    parameters: z.object({
      title: z.string(),
      content: z.string(),
      contentType: z
        .enum(['text/markdown', 'text/plain', 'application/json'])
        .default('text/markdown'),
    }),
    execute: async ({ title, content, contentType }) => {
      const storagePath = `${userId}/${crypto.randomUUID()}`;

      // Upload content to storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${storagePath}/v1.md`, new Blob([content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Also save as current.md for fast reads
      await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${storagePath}/current.md`, new Blob([content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      // Create artifact record
      const { data: artifact, error } = await supabaseAdmin
        .from('artifacts')
        .insert({
          user_id: userId,
          title,
          content_type: contentType,
          current_version: 1,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) throw new Error(`Artifact creation failed: ${error.message}`);

      // Create version record
      await supabaseAdmin.from('artifact_versions').insert({
        artifact_id: artifact.id,
        version: 1,
        storage_path: `${storagePath}/v1.md`,
        change_summary: 'Initial version',
      });

      return { id: artifact.id, title, version: 1 };
    },
  });
}

export function artifactUpdateTool(userId: string) {
  return tool({
    description:
      'Update an existing document artifact. Creates a new version. Use when the student asks to revise, edit, or improve a document.',
    parameters: z.object({
      artifactId: z.string(),
      content: z.string(),
      changeSummary: z
        .string()
        .describe('Brief description of what changed'),
    }),
    execute: async ({ artifactId, content, changeSummary }) => {
      // Get current artifact
      const { data: artifact, error } = await supabaseAdmin
        .from('artifacts')
        .select('*')
        .eq('id', artifactId)
        .eq('user_id', userId)
        .single();

      if (error || !artifact) throw new Error('Artifact not found');

      const newVersion = artifact.current_version + 1;

      // Upload new version
      await supabaseAdmin.storage
        .from('artifacts')
        .upload(
          `${artifact.storage_path}/v${newVersion}.md`,
          new Blob([content]),
          { contentType: 'text/markdown', upsert: true }
        );

      // Update current.md
      await supabaseAdmin.storage
        .from('artifacts')
        .upload(`${artifact.storage_path}/current.md`, new Blob([content]), {
          contentType: 'text/markdown',
          upsert: true,
        });

      // Update artifact record
      await supabaseAdmin
        .from('artifacts')
        .update({
          current_version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      // Create version record
      await supabaseAdmin.from('artifact_versions').insert({
        artifact_id: artifactId,
        version: newVersion,
        storage_path: `${artifact.storage_path}/v${newVersion}.md`,
        change_summary: changeSummary,
      });

      return { id: artifactId, version: newVersion, changeSummary };
    },
  });
}
