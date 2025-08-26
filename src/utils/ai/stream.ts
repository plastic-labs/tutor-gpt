import type { NextResponse } from 'next/server'
import type { StreamResponseChunk } from './types'

const encoder = new TextEncoder()

export function stream(
  iterator: AsyncGenerator<string, NextResponse | undefined, unknown>
) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(encoder.encode(value))
      }
    },
  })
}

export function formatStreamChunk(chunk: StreamResponseChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}
