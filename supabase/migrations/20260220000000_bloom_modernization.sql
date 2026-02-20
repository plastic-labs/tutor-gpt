-- Bloom Modernization Migration
-- Adds conversation cache, message cache, artifacts, and artifact versions tables

-- Conversation cache (local mirror of Honcho sessions)
CREATE TABLE IF NOT EXISTS conversation_cache (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_preview TEXT,
  message_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_conversation_cache_user
  ON conversation_cache(user_id, updated_at DESC);

ALTER TABLE conversation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own conversations" ON conversation_cache
  FOR ALL USING (auth.uid() = user_id);

-- Message cache (local mirror of Honcho messages)
CREATE TABLE IF NOT EXISTS message_cache (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversation_cache(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  peer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_cache_conversation
  ON message_cache(conversation_id, created_at);

ALTER TABLE message_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON message_cache
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversation_cache WHERE user_id = auth.uid()
    )
  );

-- Artifacts (document authoring)
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT DEFAULT 'text/markdown',
  current_version INT DEFAULT 1,
  storage_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own artifacts" ON artifacts
  FOR ALL USING (auth.uid() = user_id);

-- Artifact versions
CREATE TABLE IF NOT EXISTS artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE NOT NULL,
  version INT NOT NULL,
  storage_path TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artifact_id, version)
);

ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own versions" ON artifact_versions
  FOR ALL USING (
    artifact_id IN (
      SELECT id FROM artifacts WHERE user_id = auth.uid()
    )
  );

-- Create storage bucket for artifacts (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can manage their own artifact files
CREATE POLICY "Users manage own artifact files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'artifacts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
