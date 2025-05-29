import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { honcho } from '@/utils/honcho';
import { collectionChat } from '@/utils/pdfChat';
import { parsePDF } from '@/utils/parsePdf';
import { ChatCallProps } from './types';
import { formatStreamChunk } from '@/utils/ai/stream';
import { validateUser } from '@/utils/ai/validation';
import {
  fetchConversationHistory,
  saveConversation,
} from '@/utils/ai/conversation';
import {
  buildThoughtPrompt,
  buildResponsePrompt,
  extractTagContent,
} from '@/utils/ai/prompts';
import { checkAndGenerateSummary } from '@/utils/ai/summary';
import { streamText } from '@/utils/ai';
import { Collection } from 'honcho-ai/resources/apps/users/collections/collections.mjs';
import { StreamingXmlParser } from '@/utils/ai/streamingXmlParser';

const MAX_COLLECTION_SIZE_IN_MB = 5;

// Main chat response generator
export async function* respond({
  message,
  conversationId,
  fileContent,
}: ChatCallProps) {
  // Validate user and permissions
  const userValidation = await validateUser();
  if (!userValidation.isAuthorized) {
    return new NextResponse(userValidation.error, {
      status: userValidation.status,
    });
  }

  // We know userData exists if isAuthorized is true
  const { userData } = userValidation;
  if (!userData) {
    return new NextResponse('User data not found', { status: 500 });
  }

  const { appId, userId } = userData;

  // Fetch conversation history
  const {
    messages: messageHistory,
    thoughts: thoughtHistory,
    honchoMessages: honchoHistory,
    pdfMessages: pdfHistory,
    summaries: summaryHistory,
    collectionId: existingCollectionId,
  } = await fetchConversationHistory(appId, userId, conversationId);

  // Generate thought
  const thoughtPrompt = buildThoughtPrompt(
    messageHistory,
    thoughtHistory,
    honchoHistory,
    pdfHistory,
    message,
    Boolean(fileContent || existingCollectionId)
  );
  const { textStream: thoughtStream } = streamText({
    messages: thoughtPrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'thought',
    },
  });

  // Initialize XML parser for streaming thought parsing
  const xmlParser = new StreamingXmlParser();
  let thought = '';
  let honchoQuery = '';
  let pdfQuery = '';

  for await (const chunk of thoughtStream) {
    thought += chunk;

    // Parse the chunk for XML content
    const parsedChunks = xmlParser.parse(chunk);

    for (const parsedChunk of parsedChunks) {
      // Emit the appropriate stream chunk type
      yield formatStreamChunk({
        type: parsedChunk.type,
        text: parsedChunk.text,
      });

      // Track complete queries for later use
      if (parsedChunk.isComplete) {
        if (parsedChunk.type === 'honchoQuery') {
          honchoQuery = parsedChunk.text;
        } else if (parsedChunk.type === 'pdfQuery') {
          pdfQuery = parsedChunk.text;
        }
      }
    }
  }

  // Extract final queries using fallback method if streaming didn't capture them
  if (!honchoQuery) {
    honchoQuery = extractTagContent(thought, 'honcho');
  }
  if (!pdfQuery) {
    pdfQuery = extractTagContent(thought, 'pdf-agent');
  }

  const [honchoContent, { pdfContent, collectionId }] = await Promise.all([
    // HONCHO STUFF
    (async () => {
      const { content: honchoContent } = await honcho.apps.users.sessions.chat(
        appId,
        userId,
        conversationId,
        { queries: honchoQuery }
      );
      return honchoContent;
    })(),
    // PDF STUFF
    (async () => {
      // Get PDF response if needed
      let pdfContent = '';
      let collectionId: string | undefined;
      const fileContentArray = await fileContent;
      if (fileContentArray || existingCollectionId) {
        // If we have a new file, create a collection and add documents
        if (fileContentArray) {
          let collection: Collection;
          const sizeInMB = fileContentArray.reduce((acc, content) => {
            return acc + content.length / 1024 / 1024;
          }, 0);
          if (existingCollectionId) {
            collection = await honcho.apps.users.collections.get(
              appId,
              userId,
              { collection_id: existingCollectionId }
            );
            const currentSizeInMB = collection.metadata.size as number;
            console.log('new size', currentSizeInMB + sizeInMB);
            if (currentSizeInMB + sizeInMB < MAX_COLLECTION_SIZE_IN_MB) {
              await honcho.apps.users.collections.update(
                appId,
                userId,
                existingCollectionId,
                {
                  metadata: {
                    size: currentSizeInMB + sizeInMB,
                  },
                }
              );
            } else {
              return {
                pdfContent:
                  'The user has reached the maximum file amount for this chat. Bloom, please inform them that they need to start a new conversation if they want to upload the new file that they just tried to upload. Thank you!',
                collectionId: undefined,
              };
            }
          } else {
            collection = await honcho.apps.users.collections.create(
              appId,
              userId,
              {
                name: `PDF Collection - ${conversationId}`,
                metadata: {
                  size: sizeInMB,
                },
              }
            );
          }
          collectionId = collection.id;

          // Add each page of the PDF as a document to the collection
          await Promise.all(
            fileContentArray.map((content, index) =>
              honcho.apps.users.collections.documents.create(
                appId,
                userId,
                collection.id,
                {
                  content,
                  metadata: {
                    type: 'pdf',
                    page: index + 1,
                    conversationId,
                  },
                }
              )
            )
          );
        } else {
          // Use existing collection if no new file
          collectionId = existingCollectionId;
        }

        // Get PDF query from thought stream - skip if empty or None
        if (pdfQuery == 'None' || pdfQuery == '') {
          return { pdfContent: '', collectionId };
        }

        // Use collectionChat to get response from the collection
        try {
          const collectionResponse = await collectionChat({
            collectionId: collectionId!,
            question: pdfQuery,
            metadata: {
              sessionId: conversationId,
              userId,
              appId,
            },
          });

          pdfContent = collectionResponse;
        } catch (error) {
          console.error('Error in collectionChat:', error);
          return {
            pdfContent: 'There was an error processing your PDF.',
            collectionId,
          };
        }

        return { pdfContent, collectionId };
      }
      return { pdfContent: '', collectionId: undefined };
    })(),
  ]);

  yield formatStreamChunk({
    type: 'honcho',
    text: honchoContent,
  });

  yield formatStreamChunk({
    type: 'pdf',
    text: pdfContent,
  });

  // Get last summary
  const lastSummary = summaryHistory[0]?.content;

  // Schedule summary generation if needed
  after(async () => {
    await checkAndGenerateSummary(
      appId,
      userId,
      conversationId,
      messageHistory,
      summaryHistory,
      lastSummary
    );
  });

  // Generate response
  const responsePrompt = buildResponsePrompt(
    messageHistory,
    honchoHistory,
    pdfHistory,
    message,
    honchoContent,
    pdfContent,
    lastSummary
  );

  const { textStream: responseStream } = streamText({
    messages: responsePrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'response',
    },
  });

  let response = '';
  for await (const chunk of responseStream) {
    response += chunk;
    yield formatStreamChunk({
      type: 'response',
      text: chunk,
    });
  }

  // Save conversation data
  await saveConversation(
    appId,
    userId,
    conversationId,
    message,
    thought,
    honchoContent,
    pdfContent,
    response,
    collectionId
  );

  return new NextResponse(response);
}
