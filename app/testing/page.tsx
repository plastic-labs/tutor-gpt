'use client';

import { cn } from '@/utils/helpers';
import { ChevronDown, Search } from 'lucide-react';
import { motion, useAnimate } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import BloomLogo from '@/components/bloomlogo';

interface StreamingTextProps {
  stream: string[];
  finished: boolean;
}

function StreamingText({ stream, finished }: StreamingTextProps) {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    // Combine all chunks into a single string
    const combinedText = stream.join('');

    // Split the combined text into words
    let wordList = combinedText.split(' ');
    if (!finished) {
      wordList = wordList.slice(0, wordList.length - 1);
    }

    setWords(wordList);
  }, [stream, finished]);

  return (
    <div>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{
            duration: 0.7,
            ease: [0.11, 0, 0.5, 0],
          }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </div>
  );
}

interface StreamResponseChunk {
  type:
    | 'thought'
    | 'honcho_query'
    | 'pdf_query'
    | 'honcho_response'
    | 'pdf_response'
    | 'response';
  text: string;
}

class StreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder: TextDecoder;
  private buffer: string;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
    this.decoder = new TextDecoder();
    this.buffer = '';
  }

  private tryParseNextJSON(): {
    parsed: StreamResponseChunk | null;
    remaining: string;
  } {
    let curlyBraceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        if (startIndex === -1) startIndex = i;
        curlyBraceCount++;
      } else if (this.buffer[i] === '}') {
        curlyBraceCount--;
        if (curlyBraceCount === 0 && startIndex !== -1) {
          try {
            const jsonStr = this.buffer.substring(startIndex, i + 1);
            const parsed = JSON.parse(jsonStr) as StreamResponseChunk;
            return {
              parsed,
              remaining: this.buffer.substring(i + 1),
            };
          } catch (e) {
            continue;
          }
        }
      }
    }

    return { parsed: null, remaining: this.buffer };
  }

  async read(): Promise<{ done: boolean; chunk?: StreamResponseChunk }> {
    while (true) {
      const { parsed, remaining } = this.tryParseNextJSON();
      if (parsed) {
        this.buffer = remaining;
        return { done: false, chunk: parsed };
      }

      const { done, value } = await this.reader.read();

      if (done) {
        if (this.buffer.trim()) {
          console.warn('Stream ended with unparsed data:', this.buffer);
        }
        return { done: true };
      }

      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  release() {
    this.reader.releaseLock();
  }
}

// Mock stream generator for testing
async function* mockStreamGenerator() {
  const mockData: StreamResponseChunk[] = [
    { type: 'thought', text: 'Analyzing the question about curiosity...' },
    {
      type: 'thought',
      text: ' This is a complex topic that involves cognitive psychology',
    },
    {
      type: 'thought',
      text: ' and neuroscience. Curiosity is often triggered by knowledge gaps',
    },
    { type: 'thought', text: ' or unexpected stimuli, prompting exploration.' },
    {
      type: 'thought',
      text: ' It plays a crucial role in learning and adaptation.',
    },
    { type: 'thought', text: ' Let me break down the mechanisms involved...' },
    {
      type: 'thought',
      text: " First, I should check what Honcho knows about the user's background.",
    },
    {
      type: 'honcho_query',
      text: "What do we know about the user's educational background and interests in psychology or neuroscience?",
    },
    {
      type: 'honcho_response',
      text: 'The user has a background in computer science and has shown interest in cognitive psychology in previous interactions. They prefer practical, real-world applications of theoretical concepts.',
    },
    {
      type: 'pdf_query',
      text: 'Find recent research papers about the neuroscience of curiosity and its practical applications in education.',
    },
    {
      type: 'pdf_response',
      text: "According to recent research, curiosity enhances learning outcomes. Studies show that students who are more curious retain information better. One paper found that curiosity activates the brain's reward system, leading to increased engagement and motivation.",
    },
    {
      type: 'response',
      text: 'Curiosity is a fundamental aspect of human cognition that drives learning and exploration.',
    },
    {
      type: 'response',
      text: ' It involves seeking new information and experiences, and is often triggered by knowledge gaps or unexpected stimuli.',
    },
    {
      type: 'response',
      text: ' Understanding curiosity can help educators and learners foster a more effective learning environment.',
    },
    {
      type: 'response',
      text: ' Would you like to know more about the neuroscience or practical applications of curiosity?',
    },
  ];

  for (const chunk of mockData) {
    await new Promise((resolve) => setTimeout(resolve, 900)); // Slower streaming
    yield new TextEncoder().encode(JSON.stringify(chunk));
  }
}

interface ThinkBoxProps {
  thoughtChunks: string[];
  finished: boolean;
  honchoQuery: string;
  honchoResponse: string;
  pdfQuery: string;
  pdfResponse: string;
}

function ThinkBox({
  thoughtChunks,
  finished,
  honchoQuery,
  honchoResponse,
  pdfQuery,
  pdfResponse,
}: ThinkBoxProps) {
  const [scope, animate] = useAnimate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [hasAnimated, setHasAnimated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Collapse automatically when finished, after a short delay
  useEffect(() => {
    if (finished) {
      const timer = setTimeout(() => setCollapsed(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setCollapsed(false);
    }
  }, [finished]);

  // Initial animation when component mounts
  useEffect(() => {
    animate(
      scope.current,
      {
        filter: 'blur(0px)',
        opacity: 1,
      },
      { duration: 0.5, ease: 'easeInOut' }
    );
  }, []);

  // Set up ResizeObserver to track content height
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(contentRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // Animation when content starts streaming
  useEffect(() => {
    if (
      (thoughtChunks.length > 0 ||
        honchoQuery ||
        honchoResponse ||
        pdfQuery ||
        pdfResponse) &&
      !hasAnimated
    ) {
      setHasAnimated(true);
      runStreamAnimation();
    }
  }, [thoughtChunks, honchoQuery, honchoResponse, pdfQuery, pdfResponse]);

  async function runStreamAnimation() {
    await Promise.all([
      animate(
        scope.current,
        {
          flexGrow: 1,
        },
        { duration: 0.5, ease: 'easeInOut' }
      ),
      animate(
        '#thinking-text',
        {
          opacity: 1,
          display: 'block',
          filter: 'blur(0px)',
        },
        { delay: 0.1, duration: 0.5, ease: [0.11, 0, 0.5, 0] }
      ),
      animate(
        '#chevron-icon',
        {
          opacity: 1,
          display: 'block',
          filter: 'blur(0px)',
        },
        { delay: 0.1, duration: 0.5, ease: [0.11, 0, 0.5, 0] }
      ),
    ]);

    animate(
      '#initial-text',
      {
        opacity: 1,
        display: 'block',
      },
      { duration: 0.5, ease: 'easeInOut' }
    );
  }

  // Animate height for collapse/expand
  const content = (
    <div ref={contentRef} className="flex flex-col">
      <div
        className="flex items-center p-5 justify-between h-14 border-b border-gray-200 cursor-pointer select-none"
        id="top-bar"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <BloomLogo />
          <span id="thinking-text" className="opacity-0 blur-sm hidden">
            Thinking...
          </span>
        </div>
        <motion.div
          id="chevron-icon"
          className="opacity-0 blur-sm hidden"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
      <motion.div
        id="initial-text"
        className="p-5 border-t border-gray-200 opacity-0 hidden"
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        style={{
          overflow: 'hidden',
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {thoughtChunks.length > 0 && (
          <div className="mb-4">
            <StreamingText stream={thoughtChunks} finished={finished} />
          </div>
        )}
        {(honchoQuery || pdfQuery) && (
          <div className="flex flex-col md:flex-row gap-6 w-full">
            {/* Honcho Column */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-1 mb-2 text-gray-500 text-sm">
                <Search className="w-4 h-4" />
                <span className="font-semibold">Honcho</span>
              </div>
              {honchoQuery && honchoResponse ? (
                <div className="relative flex flex-col items-stretch">
                  <div className="bg-stone-100 rounded-xl p-4 mb-3 text-gray-700 text-base whitespace-pre-line z-10">
                    {honchoQuery}
                  </div>
                  {/* Vertical line */}
                  <div
                    className="absolute left-1/2 top-[calc(2.5rem+1.5rem)] bottom-[2.5rem] w-0.5 bg-gray-300 mx-auto"
                    style={{ transform: 'translateX(-50%)' }}
                  ></div>
                  <div className="bg-stone-100 rounded-xl p-4 text-gray-700 text-base whitespace-pre-line z-10">
                    {honchoResponse}
                  </div>
                </div>
              ) : (
                <>
                  {honchoQuery && (
                    <div className="bg-stone-100 rounded-xl p-4 mb-3 text-gray-700 text-base whitespace-pre-line">
                      {honchoQuery}
                    </div>
                  )}
                  {honchoResponse && (
                    <div className="bg-stone-100 rounded-xl p-4 text-gray-700 text-base whitespace-pre-line">
                      {honchoResponse}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* PDF Column */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-1 mb-2 text-gray-500 text-sm">
                <Search className="w-4 h-4" />
                <span className="font-semibold">PDF</span>
              </div>
              {pdfQuery && pdfResponse ? (
                <div className="relative flex flex-col items-stretch">
                  <div className="bg-stone-100 rounded-xl p-4 mb-3 text-gray-700 text-base whitespace-pre-line z-10">
                    {pdfQuery}
                  </div>
                  {/* Vertical line */}
                  <div
                    className="absolute left-1/2 top-[calc(2.5rem+1.5rem)] bottom-[2.5rem] w-0.5 bg-gray-300 mx-auto"
                    style={{ transform: 'translateX(-50%)' }}
                  ></div>
                  <div className="bg-stone-100 rounded-xl p-4 text-gray-700 text-base whitespace-pre-line z-10">
                    {pdfResponse}
                  </div>
                </div>
              ) : (
                <>
                  {pdfQuery && (
                    <div className="bg-stone-100 rounded-xl p-4 mb-3 text-gray-700 text-base whitespace-pre-line">
                      {pdfQuery}
                    </div>
                  )}
                  {pdfResponse && (
                    <div className="bg-stone-100 rounded-xl p-4 text-gray-700 text-base whitespace-pre-line">
                      {pdfResponse}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="flex w-full justify-center">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl text-gray-500 flex flex-col blur-sm opacity-0 overflow-hidden"
        ref={scope}
        animate={{
          height: collapsed ? 49 : height,
        }} // 64px = h-14 for top bar
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: 0 }}
      >
        {content}
      </motion.div>
    </div>
  );
}

export default function Testing() {
  const [showThinkBox, setShowThinkBox] = useState(false);
  const [thoughtChunks, setThoughtChunks] = useState<string[]>([]);
  const [honchoQuery, setHonchoQuery] = useState('');
  const [honchoResponse, setHonchoResponse] = useState('');
  const [pdfQuery, setPdfQuery] = useState('');
  const [pdfResponse, setPdfResponse] = useState('');
  const [responseChunks, setResponseChunks] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!showThinkBox) return;

    let isMounted = true;
    let generator: ReturnType<typeof mockStreamGenerator>;

    async function processStream() {
      generator = mockStreamGenerator();
      setFinished(false);
      const stream = new ReadableStream({
        async pull(controller) {
          const { value, done } = await generator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
      });

      const streamReader = new StreamReader(stream);

      while (true) {
        const { done, chunk } = await streamReader.read();
        if (done) break;
        if (!chunk) continue;

        if (isMounted) {
          switch (chunk.type) {
            case 'thought':
              setThoughtChunks((prev) => [...prev, chunk.text]);
              break;
            case 'honcho_query':
              setHonchoQuery((prev) => prev + chunk.text);
              break;
            case 'honcho_response':
              setHonchoResponse((prev) => prev + chunk.text);
              break;
            case 'pdf_query':
              setPdfQuery((prev) => prev + chunk.text);
              break;
            case 'pdf_response':
              setPdfResponse((prev) => prev + chunk.text);
              break;
            case 'response':
              setResponseChunks((prev) => [...prev, chunk.text]);
              break;
          }
        }
      }
      if (isMounted) setFinished(true);
      streamReader.release();
    }

    processStream();

    return () => {
      isMounted = false;
      setThoughtChunks([]);
      setHonchoQuery('');
      setHonchoResponse('');
      setPdfQuery('');
      setPdfResponse('');
      setResponseChunks([]);
      setFinished(false);
    };
  }, [showThinkBox]);

  return (
    <div className="h-full w-full flex justify-center">
      <div className="w-full max-w-[740px] px-5 flex flex-col items-center gap-7">
        {/* User message */}
        <div className="self-stretch flex justify-end">
          <div className="p-3.5 bg-stone-200 rounded-2xl">
            <div className="text-black text-base font-normal">
              I want to know about how curiosity works.
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowThinkBox(!showThinkBox)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {showThinkBox ? 'Hide Think Box' : 'Show Think Box'}
        </button>

        {showThinkBox && (
          <ThinkBox
            thoughtChunks={thoughtChunks}
            finished={finished}
            honchoQuery={honchoQuery}
            honchoResponse={honchoResponse}
            pdfQuery={pdfQuery}
            pdfResponse={pdfResponse}
          />
        )}

        {responseChunks.length > 0 && (
          <div className="text-black text-base font-normal">
            <StreamingText stream={responseChunks} finished={finished} />
          </div>
        )}
      </div>
    </div>
  );
}
