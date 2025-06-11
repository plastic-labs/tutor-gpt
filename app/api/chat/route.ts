import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/utils/parsePdf';
import { respond } from '@/utils/ai/index';
import { stream } from '@/utils/ai/stream';
import { checkChatRateLimit } from '@/utils/arcjet';

export const runtime = 'nodejs';
export const maxDuration = 300; // TODO: increase when fluid compute turns on
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(req: NextRequest) {
  try {

    const rateLimitResult = await checkChatRateLimit(req);

    if (!rateLimitResult.allowed) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (rateLimitResult.remaining !== undefined) {
        headers['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
      }
      if (rateLimitResult.resetTime !== undefined) {
        headers['X-RateLimit-Reset'] = rateLimitResult.resetTime.toString();
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitResult.reason || 'Too many requests. Please wait before trying again.',
          details: 'You can make up to 8 chat requests per minute. Please wait a moment before sending another message.'
        }),
        {
          status: 429,
          headers
        }
      );
    }

    const formData = await req.formData();
    const message = formData.get('message') as string;
    const conversationId = formData.get('conversationId') as string;
    const file = formData.get('file') as File | null;

    if (!message || !conversationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    let fileContent: Promise<string[]> | undefined;
    if (file) {
      // Check file size before reading content
      const fileSizeLimit = 5 * 1024 * 1024; // 5MB
      if (file.size > fileSizeLimit) {
        return new NextResponse('File size exceeds the 5MB limit', {
          status: 413,
        }); // 413 Payload Too Large
      }

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

    // Create response with rate limit headers
    const response = new Response(
      stream(respond({ message, conversationId, fileContent })),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
          ...(rateLimitResult.remaining !== undefined && {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          }),
          ...(rateLimitResult.resetTime !== undefined && {
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          })
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Error processing chat request:', error);

    // Check if the error is related to rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit service error',
          message: 'Unable to verify rate limit. Please try again.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
