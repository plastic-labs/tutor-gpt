// Test setup for backend
// Add global mocks and test utilities here

import { vi } from 'vitest';

// Mock environment variables
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.AI_API_KEY = 'test-api-key';
process.env.AI_BASE_URL = 'http://localhost:11434/v1';
process.env.MODEL = 'test-model';
process.env.HONCHO_URL = 'http://localhost:8000';
process.env.HONCHO_APP_NAME = 'test-app';
process.env.FRONTEND_URL = 'http://localhost:5173';
