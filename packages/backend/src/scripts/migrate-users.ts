/**
 * Migration script for existing Honcho users.
 *
 * Backfills the Supabase conversation_cache and message_cache tables
 * from existing Honcho sessions and messages.
 *
 * Usage: bun run src/scripts/migrate-users.ts
 *
 * This script is idempotent - it uses upserts and can be re-run safely.
 */

import { honcho } from '../services/honcho/client.js';
import { supabaseAdmin } from '../services/supabase/admin.js';

async function migrate() {
  console.log('Starting user migration...');

  // Get all Supabase users
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const users = authData?.users ?? [];
  console.log(`Found ${users.length} users to migrate`);

  let totalConversations = 0;
  let totalMessages = 0;

  for (const user of users) {
    try {
      console.log(`\nMigrating user: ${user.email} (${user.id})`);

      // Get or create Honcho peer for this user
      const peer = await honcho.peer(user.id);

      // List all sessions for this peer
      const sessionsPage = await peer.sessions();
      const sessions = sessionsPage.items;

      console.log(`  Found ${sessions.length} conversations`);

      for (const session of sessions) {
        // Collect messages
        const messagesPage = await session.messages();
        const messages = messagesPage.items;

        const lastMessage = messages[messages.length - 1];

        // Upsert conversation cache
        await supabaseAdmin.from('conversation_cache').upsert(
          {
            id: session.id,
            user_id: user.id,
            title: (session.metadata?.name as string) ?? 'Untitled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_preview: lastMessage?.content?.slice(0, 200) ?? null,
            message_count: messages.length,
            metadata: (session.metadata ?? {}) as any,
          },
          { onConflict: 'id' }
        );

        // Upsert message cache
        for (const msg of messages) {
          await supabaseAdmin.from('message_cache').upsert(
            {
              id: msg.id,
              conversation_id: session.id,
              user_id: user.id,
              content: msg.content,
              is_user: msg.peerId === peer.id,
              metadata: (msg.metadata ?? {}) as any,
              created_at: msg.createdAt ?? new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }

        totalMessages += messages.length;
        totalConversations++;
      }
    } catch (error) {
      console.error(`  Error migrating user ${user.email}:`, error);
    }
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Conversations: ${totalConversations}`);
  console.log(`Messages: ${totalMessages}`);
}

migrate().catch(console.error);
