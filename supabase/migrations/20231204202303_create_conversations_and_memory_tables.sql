CREATE TABLE IF NOT EXISTS memory (
  "id" SERIAL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "message_type" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "message" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
