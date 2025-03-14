import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import pdfPrompt from '@/utils/prompts/pdf';
import { pdfChat, collectionChat } from '@/utils/pdfChat';
import { honcho, getHonchoApp, getHonchoUser } from '@/utils/honcho';

// Mock unstable_cache to just return the function as-is
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

interface HonchoCollection {
  id: string;
  name: string;
  [key: string]: any;
}

// Helper to generate random collection names
const generateRandomName = () =>
  `test-collection-${Math.random().toString(36).substring(2, 15)}`;

// Track collections to clean up
let collectionsToCleanup: {
  appId: string;
  userId: string;
  collectionId: string;
}[] = [];

beforeEach(() => {
  collectionsToCleanup = [];
});

afterEach(async () => {
  // Clean up all collections created during the test
  await Promise.all(
    collectionsToCleanup.map(({ appId, userId, collectionId }) =>
      honcho.apps.users.collections
        .delete(appId, userId, collectionId)
        .catch((error) =>
          console.warn(`Failed to cleanup collection ${collectionId}:`, error)
        )
    )
  );
  collectionsToCleanup = [];
});

test('PDF prompt generation', () => {
  const pdfContext = 'This is a sample PDF content about machine learning.';
  const question = 'What is this document about?';

  const messages = pdfPrompt(pdfContext, question);

  // Check that we get an array of messages
  expect(Array.isArray(messages)).toBe(true);
  expect(messages.length).toBeGreaterThan(0);

  // Check that the PDF content is included in the final message
  const lastMessage = messages[messages.length - 1];
  expect(lastMessage.role).toBe('user');
  expect(lastMessage.content).includes(pdfContext);
  expect(lastMessage.content).includes(question);

  // Verify the conversation flow establishes the agent's role
  const roleMessages = messages.filter(
    (m) =>
      m.content.toLowerCase().includes('pdf') &&
      m.content.toLowerCase().includes('agent')
  );
  expect(roleMessages.length).toBeGreaterThan(0);
});

test('Collection chat queries real Honcho collection', async () => {
  // Get real Honcho app and user
  const honchoApp = await getHonchoApp();
  const testUser = await getHonchoUser('test-user');
  let collection: HonchoCollection;

  try {
    // Create test collection with random name
    collection = await honcho.apps.users.collections.create(
      honchoApp.id,
      testUser.id,
      {
        name: generateRandomName(),
      }
    );
    collectionsToCleanup.push({
      appId: honchoApp.id,
      userId: testUser.id,
      collectionId: collection.id,
    });

    // Add test documents with unique identifiers and specific content
    await honcho.apps.users.collections.documents.create(
      honchoApp.id,
      testUser.id,
      collection.id,
      {
        content:
          'XTEST-2024-ID-001: The Zorblex Algorithm is a specialized computational model developed by Dr. Yara Mendes in 2024. It uses quantum-inspired neural pathways to process non-linear data streams.',
        metadata: { type: 'article' },
      }
    );

    await honcho.apps.users.collections.documents.create(
      honchoApp.id,
      testUser.id,
      collection.id,
      {
        content:
          'XTEST-2024-ID-002: Recent applications of the Zorblex Algorithm in climate modeling have shown a 73.8% improvement in prediction accuracy according to the Mendes-Thompson Metric (MTM-2024).',
        metadata: { type: 'research' },
      }
    );

    const params = {
      collectionId: collection.id,
      question: 'What is the Zorblex Algorithm and who developed it?',
      metadata: {
        sessionId: 'test-session',
        userId: testUser.id,
        appId: honchoApp.id,
      },
    };

    const response = await collectionChat(params);

    // Verify response contains specific content that wouldn't be in the LLM's training data
    expect(response.toLowerCase()).toContain('zorblex');
    expect(response.toLowerCase()).toContain('yara mendes');
    expect(response.toLowerCase()).toContain('2024');
    expect(response.toLowerCase()).toContain('quantum-inspired');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});

test('Collection chat handles empty collection', async () => {
  // Get real Honcho app and user
  const honchoApp = await getHonchoApp();
  const testUser = await getHonchoUser('test-user');
  let emptyCollection: HonchoCollection;

  try {
    // Create empty collection with random name
    emptyCollection = await honcho.apps.users.collections.create(
      honchoApp.id,
      testUser.id,
      {
        name: generateRandomName(),
      }
    );
    collectionsToCleanup.push({
      appId: honchoApp.id,
      userId: testUser.id,
      collectionId: emptyCollection.id,
    });

    const params = {
      collectionId: emptyCollection.id,
      question: 'What is the Zorblex Algorithm?',
      metadata: {
        sessionId: 'test-session',
        userId: testUser.id,
        appId: honchoApp.id,
      },
    };

    const response = await collectionChat(params);

    // Response should indicate no information found about this specific topic
    expect(typeof response).toBe('string');
    expect(response.toLowerCase()).not.toContain('thompson');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});

test('Collection chat with large document set', async () => {
  // Get real Honcho app and user
  const honchoApp = await getHonchoApp();
  const testUser = await getHonchoUser('test-user');
  let collection: HonchoCollection;

  try {
    // Create collection with random name
    collection = await honcho.apps.users.collections.create(
      honchoApp.id,
      testUser.id,
      {
        name: generateRandomName(),
      }
    );
    collectionsToCleanup.push({
      appId: honchoApp.id,
      userId: testUser.id,
      collectionId: collection.id,
    });

    // Add multiple documents with unique identifiers and specific content
    const documents = [
      'XTEST-2024-ID-101: The Quantumflow programming language, created by Dr. Aisha Patel in March 2024, introduces the concept of quantum-state variables.',
      'XTEST-2024-ID-102: Quantumflow\'s unique feature is the "superposition typing system" which allows variables to exist in multiple type states simultaneously.',
      'XTEST-2024-ID-103: The Nexus IDE, released alongside Quantumflow, provides specialized debugging tools for quantum-state variables.',
      'XTEST-2024-ID-104: Early adopters of Quantumflow include the Stellar Computing Group at MIT and the Quantum Research Division at CERN.',
      'XTEST-2024-ID-105: Performance benchmarks show Quantumflow executing quantum algorithms 42% faster than traditional quantum simulation frameworks.',
    ];

    // Create documents in parallel
    await Promise.all(
      documents.map((content) =>
        honcho.apps.users.collections.documents.create(
          honchoApp.id,
          testUser.id,
          collection.id,
          {
            content,
            metadata: { type: 'documentation' },
          }
        )
      )
    );

    const params = {
      collectionId: collection.id,
      question: 'What is Quantumflow and what makes it unique?',
      metadata: {
        sessionId: 'test-session',
        userId: testUser.id,
        appId: honchoApp.id,
      },
    };

    const response = await collectionChat(params);

    // Verify response contains specific content that wouldn't be in the LLM's training data
    expect(response.toLowerCase()).toContain('quantumflow');
    expect(response.toLowerCase()).toContain('aisha patel');
    expect(response.toLowerCase()).toContain('superposition typing');
    expect(response.toLowerCase()).toContain('march 2024');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
