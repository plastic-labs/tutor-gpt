'use client';
import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, useAnimate } from 'motion/react';
import BloomLogo from '@/components/bloomlogo';

interface StreamingTextProps {
  stream: string[];
  finished: boolean;
}

/**
 * Animates the appearance of streaming text by fading in and deblurring each word as it arrives.
 *
 * Displays words from the provided text chunks, updating in real time as new chunks are received. If streaming is not finished, the last partial word is excluded from display.
 *
 * @param stream - Array of string chunks representing the streaming text.
 * @param finished - Indicates whether the streaming is complete.
 */
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

export interface ThinkBoxProps {
  thoughtChunks?: string[]; // For streaming (live messages)
  thoughtContent?: string; // For complete content (past messages)
  finished: boolean;
  honchoQuery: string;
  honchoResponse: string;
  pdfQuery: string;
  pdfResponse: string;
}

/**
 * Displays a collapsible, animated container for streaming or completed thought content, with optional query and response sections for "Honcho" and "PDF" sources.
 *
 * The component animates its appearance and content transitions, supports both streaming and historical messages, and automatically collapses after displaying new content. It conditionally renders query/response columns for additional context and manages dynamic sizing for smooth expand/collapse behavior.
 *
 * @param thoughtChunks - Optional array of string chunks representing streaming thought content.
 * @param thoughtContent - Optional complete string for historical thought content.
 * @param finished - Indicates whether the thought content is complete.
 * @param honchoQuery - Query string for the "Honcho" section.
 * @param honchoResponse - Response string for the "Honcho" section.
 * @param pdfQuery - Query string for the "PDF" section.
 * @param pdfResponse - Response string for the "PDF" section.
 */
export default function ThinkBox({
  thoughtChunks,
  thoughtContent,
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
  const [hasContentAnimated, setHasContentAnimated] = useState(false);
  const [collapsed, setCollapsed] = useState(finished); // Start collapsed if already finished

  // Collapse automatically when finished, after a short delay (only for new messages, not historical)
  useEffect(() => {
    if (finished && hasContentAnimated) {
      // Only auto-collapse if we actually animated the content (meaning it's a new message)
      const timer = setTimeout(() => setCollapsed(true), 1200);
      return () => clearTimeout(timer);
    } else if (!finished) {
      setCollapsed(false);
    }
  }, [finished, hasContentAnimated]);

  // Initial animation when component mounts - show immediately
  useEffect(() => {
    if (!hasAnimated) {
      setHasAnimated(true);
      if (finished) {
        // For finished messages (historical), show everything immediately without animation
        animate(
          scope.current,
          { filter: 'blur(0px)', opacity: 1 },
          { duration: 0 }
        );
        animate(
          '#thinking-text',
          { opacity: 1, display: 'block', filter: 'blur(0px)' },
          { duration: 0 }
        );
        animate(
          '#chevron-icon',
          { opacity: 1, display: 'block', filter: 'blur(0px)' },
          { duration: 0 }
        );
        animate(
          '#initial-text',
          { opacity: 1, display: 'block' },
          { duration: 0 }
        );
        setHasContentAnimated(true);
      } else {
        // For new messages, show just the basic container
        animate(
          scope.current,
          {
            filter: 'blur(0px)',
            opacity: 1,
          },
          { duration: 0.5, ease: 'easeInOut' }
        );
      }
    }
  }, [animate, scope, hasAnimated, finished]);

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
      ((thoughtChunks && thoughtChunks.length > 0) ||
        thoughtContent ||
        honchoQuery ||
        honchoResponse ||
        pdfQuery ||
        pdfResponse) &&
      !hasContentAnimated
    ) {
      setHasContentAnimated(true);
      runContentAnimation();
    }
  }, [
    thoughtChunks,
    thoughtContent,
    honchoQuery,
    honchoResponse,
    pdfQuery,
    pdfResponse,
    hasContentAnimated,
  ]);

  async function runContentAnimation() {
    // First expand the box and show header elements
    animate(
      '#thinking-text',
      {
        opacity: 0,
        filter: 'blur(4px)',
      },
      { duration: 0 }
    );
    animate(
      '#chevron-icon',
      { opacity: 0, filter: 'blur(4px)' },
      { duration: 0 }
    );
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

    // Then show the content area
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
      <motion.div
        className="flex items-center p-5 justify-between h-14 border-b border-gray-200 cursor-pointer select-none"
        id="top-bar"
        onClick={() => setCollapsed((c) => !c)}
        animate={{
          borderBottomColor: collapsed
            ? 'rgba(229, 231, 235, 0)'
            : 'rgba(229, 231, 235, 1)',
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-2">
          <BloomLogo />
          <span id="thinking-text" className="hidden">
            {finished ? 'Thought about it' : 'Thinking...'}
          </span>
        </div>
        <motion.div
          id="chevron-icon"
          className="hidden"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
      <motion.div
        id="initial-text"
        className="p-5 border-t border-gray-200 opacity-0 hidden"
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        style={{
          overflow: 'hidden',
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {((thoughtChunks && thoughtChunks.length > 0) || thoughtContent) && (
          <div className="mb-4">
            {thoughtContent ? (
              // For past messages, show complete content without animation
              <div>{thoughtContent}</div>
            ) : (
              // For streaming messages, use animated text
              <StreamingText stream={thoughtChunks || []} finished={finished} />
            )}
          </div>
        )}
        {((honchoQuery && honchoQuery !== 'None') ||
          (honchoResponse && honchoResponse !== 'None') ||
          (pdfQuery && pdfQuery !== 'None') ||
          (pdfResponse && pdfResponse !== 'None')) && (
          <div
            className={`flex flex-col gap-6 w-full ${
              (pdfQuery && pdfQuery !== 'None') ||
              (pdfResponse && pdfResponse !== 'None')
                ? 'md:flex-row'
                : ''
            }`}
          >
            {/* Honcho Column */}
            {((honchoQuery && honchoQuery !== 'None') ||
              (honchoResponse && honchoResponse !== 'None')) && (
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
            )}

            {/* PDF Column - only show if there's PDF content */}
            {((pdfQuery && pdfQuery !== 'None') ||
              (pdfResponse && pdfResponse !== 'None')) && (
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
            )}
          </div>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="flex w-full justify-center mb-4">
      <motion.div
        className={`bg-white rounded-2xl text-gray-500 flex flex-col blur-sm opacity-0 overflow-hidden ${
          finished ? '' : 'shadow-2xl'
        }`}
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
