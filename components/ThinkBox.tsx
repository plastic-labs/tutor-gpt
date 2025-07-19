'use client'
import { ChevronDown, Search } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import BloomLogo from '@/components/bloomlogo'

interface StreamingTextProps {
  stream: string[]
  finished: boolean
}

function StreamingText({ stream, finished }: StreamingTextProps) {
  const [words, setWords] = useState<string[]>([])

  useEffect(() => {
    // Combine all chunks into a single string
    const combinedText = stream.join('')

    // Split the combined text into words
    let wordList = combinedText.split(' ')
    if (!finished) {
      wordList = wordList.slice(0, wordList.length - 1)
    }

    setWords(wordList)
  }, [stream, finished])

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
  )
}

export interface ThinkBoxProps {
  thoughtChunks?: string[] // For streaming (live messages)
  thoughtContent?: string // For complete content (past messages)
  finished: boolean
  honchoQuery: string
  honchoResponse: string
  pdfQuery: string
  pdfResponse: string
}

export default function ThinkBox({
  thoughtChunks,
  thoughtContent,
  finished,
  honchoQuery,
  honchoResponse,
  pdfQuery,
  pdfResponse,
}: ThinkBoxProps) {
  const [scope, animate] = useAnimate()
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [hasAnimated, setHasAnimated] = useState(false)
  const [hasContentAnimated, setHasContentAnimated] = useState(false)
  const [collapsed, setCollapsed] = useState(finished) // Start collapsed if already finished

  // Collapse automatically when finished, after a short delay (only for new messages, not historical)
  useEffect(() => {
    if (finished && hasContentAnimated) {
      // Only auto-collapse if we actually animated the content (meaning it's a new message)
      const timer = setTimeout(() => setCollapsed(true), 1200)
      return () => clearTimeout(timer)
    } else if (!finished) {
      setCollapsed(false)
    }
  }, [finished, hasContentAnimated])

  // Initial animation when component mounts - show immediately
  useEffect(() => {
    if (!hasAnimated) {
      setHasAnimated(true)
      if (finished) {
        // For finished messages (historical), show everything immediately without animation
        animate(
          scope.current,
          { filter: 'blur(0px)', opacity: 1 },
          { duration: 0 }
        )
        animate(
          '#thinking-text',
          { opacity: 1, display: 'block', filter: 'blur(0px)' },
          { duration: 0 }
        )
        animate(
          '#chevron-icon',
          { opacity: 1, display: 'block', filter: 'blur(0px)' },
          { duration: 0 }
        )
        animate(
          '#initial-text',
          { opacity: 1, display: 'block' },
          { duration: 0 }
        )
        setHasContentAnimated(true)
      } else {
        // For new messages, show just the basic container
        animate(
          scope.current,
          {
            filter: 'blur(0px)',
            opacity: 1,
          },
          { duration: 0.5, ease: 'easeInOut' }
        )
      }
    }
  }, [animate, scope, hasAnimated, finished])

  // Set up ResizeObserver to track content height
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height
        setHeight(observedHeight)
      })

      resizeObserver.observe(contentRef.current)

      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [])

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
      setHasContentAnimated(true)
      runContentAnimation()
    }
  }, [
    thoughtChunks,
    thoughtContent,
    honchoQuery,
    honchoResponse,
    pdfQuery,
    pdfResponse,
    hasContentAnimated,
    runContentAnimation,
  ])

  async function runContentAnimation() {
    // First expand the box and show header elements
    animate(
      '#thinking-text',
      {
        opacity: 0,
        filter: 'blur(4px)',
      },
      { duration: 0 }
    )
    animate(
      '#chevron-icon',
      { opacity: 0, filter: 'blur(4px)' },
      { duration: 0 }
    )
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
    ])

    // Then show the content area
    animate(
      '#initial-text',
      {
        opacity: 1,
        display: 'block',
      },
      { duration: 0.5, ease: 'easeInOut' }
    )
  }

  // Animate height for collapse/expand
  const content = (
    <div ref={contentRef} className="flex flex-col">
      <motion.div
        className="flex h-14 cursor-pointer select-none items-center justify-between border-border border-b p-5"
        id="top-bar"
        onClick={() => setCollapsed((c) => !c)}
        animate={{
          borderBottomColor: collapsed ? 'transparent' : 'hsl(var(--border))',
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
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
      <motion.div
        id="initial-text"
        className="hidden border-border border-t p-5 opacity-0"
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
            className={`flex w-full flex-col gap-6 ${
              (pdfQuery && pdfQuery !== 'None') ||
              (pdfResponse && pdfResponse !== 'None')
                ? 'md:flex-row'
                : ''
            }`}
          >
            {/* Honcho Column */}
            {((honchoQuery && honchoQuery !== 'None') ||
              (honchoResponse && honchoResponse !== 'None')) && (
              <div className="min-w-[220px] flex-1">
                <div className="mb-2 flex items-center gap-1 text-muted-foreground text-sm">
                  <Search className="h-4 w-4" />
                  <span className="font-semibold">Honcho</span>
                </div>
                {honchoQuery && honchoResponse ? (
                  <div className="relative flex flex-col items-stretch">
                    <div className="z-10 mb-3 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                      {honchoQuery}
                    </div>
                    {/* Vertical line */}
                    <div
                      className="absolute top-[calc(2.5rem+1.5rem)] bottom-[2.5rem] left-1/2 mx-auto w-0.5 bg-border"
                      style={{ transform: 'translateX(-50%)' }}
                    ></div>
                    <div className="z-10 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                      {honchoResponse}
                    </div>
                  </div>
                ) : (
                  <>
                    {honchoQuery && (
                      <div className="mb-3 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                        {honchoQuery}
                      </div>
                    )}
                    {honchoResponse && (
                      <div className="whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
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
              <div className="min-w-[220px] flex-1">
                <div className="mb-2 flex items-center gap-1 text-muted-foreground text-sm">
                  <Search className="h-4 w-4" />
                  <span className="font-semibold">PDF</span>
                </div>
                {pdfQuery && pdfResponse ? (
                  <div className="relative flex flex-col items-stretch">
                    <div className="z-10 mb-3 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                      {pdfQuery}
                    </div>
                    {/* Vertical line */}
                    <div
                      className="absolute top-[calc(2.5rem+1.5rem)] bottom-[2.5rem] left-1/2 mx-auto w-0.5 bg-border"
                      style={{ transform: 'translateX(-50%)' }}
                    ></div>
                    <div className="z-10 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                      {pdfResponse}
                    </div>
                  </div>
                ) : (
                  <>
                    {pdfQuery && (
                      <div className="mb-3 whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
                        {pdfQuery}
                      </div>
                    )}
                    {pdfResponse && (
                      <div className="whitespace-pre-line rounded-xl bg-muted p-4 text-base text-foreground">
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
  )

  return (
    <div className="mb-4 flex w-full justify-center">
      <motion.div
        className={`flex flex-col overflow-hidden rounded-2xl bg-card text-muted-foreground opacity-0 blur-sm ${
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
  )
}
