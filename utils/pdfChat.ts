import { generateText } from '@/utils/ai';
import pdfPrompt from '@/utils/prompts/pdf';
import { honcho } from '@/utils/honcho';

export interface PdfChatParams {
  pdfContext: string;
  question: string;
  metadata: {
    sessionId: string;
    userId: string;
  };
}

export interface CollectionChatParams {
  collectionId: string;
  question: string;
  metadata: {
    sessionId: string;
    userId: string;
    appId: string;
  };
}

interface HonchoDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export async function pdfChat({
  pdfContext,
  question,
  metadata,
}: PdfChatParams): Promise<string> {
  const messages = pdfPrompt(pdfContext, question);

  const response = await generateText({
    messages,
    temperature: 0.7,
    maxTokens: 1000,
    metadata: {
      ...metadata,
      type: 'pdf_chat',
    },
  });

  return response.text;
}

export async function collectionChat({
  collectionId,
  question,
  metadata,
}: CollectionChatParams): Promise<string> {
  // Get collection content from Honcho
  const documents = (await honcho.apps.users.collections.documents.query(
    metadata.appId,
    metadata.userId,
    collectionId,
    { query: question }
  )) as HonchoDocument[];

  // Combine all document contents into a single context
  const collectionContent = documents
    .map((doc: HonchoDocument) => doc.content)
    .join('\n\n');

  // Use the collection content as context for the PDF chat
  return pdfChat({
    pdfContext: collectionContent,
    question,
    metadata: {
      sessionId: metadata.sessionId,
      userId: metadata.userId,
    },
  });
}
