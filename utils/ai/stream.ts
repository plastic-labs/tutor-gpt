import { NextResponse } from 'next/server';
import { StreamResponseChunk } from './types';

const encoder = new TextEncoder();

export function stream(
  iterator: AsyncGenerator<Uint8Array, NextResponse | undefined, unknown>
) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

export function formatStreamChunk(chunk: StreamResponseChunk): Uint8Array {
  return encoder.encode(JSON.stringify(chunk));
}
