import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabase/admin.js';

export function documentGrepTool(userId: string) {
  return tool({
    description:
      "Search across the student's documents for matching content. Returns file names, line numbers, and matching text.",
    parameters: z.object({
      query: z.string().describe('Search pattern or keywords'),
      fileId: z
        .string()
        .optional()
        .describe('Specific artifact ID to search, or omit to search all'),
    }),
    execute: async ({ query, fileId }) => {
      try {
        // List user's artifacts
        let artifactQuery = supabaseAdmin
          .from('artifacts')
          .select('id, title, storage_path')
          .eq('user_id', userId);

        if (fileId) {
          artifactQuery = artifactQuery.eq('id', fileId);
        }

        const { data: artifacts } = await artifactQuery;
        if (!artifacts?.length) return 'No documents found.';

        const matches: { file: string; line: number; content: string }[] = [];
        const queryLower = query.toLowerCase();

        for (const artifact of artifacts) {
          const { data: fileData } = await supabaseAdmin.storage
            .from('artifacts')
            .download(`${artifact.storage_path}/current.md`);

          if (!fileData) continue;

          const text = await fileData.text();
          const lines = text.split('\n');

          lines.forEach((line, i) => {
            if (line.toLowerCase().includes(queryLower)) {
              matches.push({
                file: artifact.title,
                line: i + 1,
                content: line.trim().slice(0, 200),
              });
            }
          });
        }

        if (matches.length === 0) return 'No matches found.';
        return JSON.stringify(matches.slice(0, 20));
      } catch (error) {
        console.error('Document grep error:', error);
        return 'Error searching documents.';
      }
    },
  });
}

export function documentReadTool(userId: string) {
  return tool({
    description:
      "Read a section of a student's document. Use after grep to read surrounding context.",
    parameters: z.object({
      fileId: z.string().describe('Artifact ID to read'),
      startLine: z.number().optional(),
      endLine: z.number().optional(),
    }),
    execute: async ({ fileId, startLine, endLine }) => {
      try {
        const { data: artifact } = await supabaseAdmin
          .from('artifacts')
          .select('storage_path')
          .eq('id', fileId)
          .eq('user_id', userId)
          .single();

        if (!artifact) return 'Document not found.';

        const { data: fileData } = await supabaseAdmin.storage
          .from('artifacts')
          .download(`${artifact.storage_path}/current.md`);

        if (!fileData) return 'Unable to read document.';

        const text = await fileData.text();
        const lines = text.split('\n');
        const start = Math.max(0, (startLine ?? 1) - 1);
        const end = Math.min(lines.length, endLine ?? lines.length);

        return lines.slice(start, end).join('\n');
      } catch (error) {
        console.error('Document read error:', error);
        return 'Error reading document.';
      }
    },
  });
}
