import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/utils/parsePdf';
import { respond } from '@/utils/ai/index';
import { stream } from '@/utils/ai/stream';

export const runtime = 'nodejs';
export const maxDuration = 300; // TODO: increase when fluid compute turns on
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const conversationId = formData.get('conversationId') as string;
    const file = formData.get('file') as File | null;

    if (!message || !conversationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    let fileContent: Promise<string[]> | undefined;
    if (file) {
      // Read file content
      const buffer = await file.arrayBuffer();

      // Process based on file type
      if (file.type === 'application/pdf') {
        fileContent = parsePDF(buffer, file.name);
      } else if (file.type === 'text/plain') {
        fileContent = Promise.resolve([new TextDecoder().decode(buffer)]);
      } else {
        return new NextResponse('Unsupported file type', { status: 400 });
      }
    }

    return new Response(
      stream(respond({ message, conversationId, fileContent })),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
        },
      }
    );
  } catch (error) {
    console.error('Error processing chat request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
