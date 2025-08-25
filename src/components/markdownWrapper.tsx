import type React from 'react'
import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { FiCheck, FiCopy } from 'react-icons/fi'

const ReactMarkdown = lazy(() => import('react-markdown'))

const CopyButton = memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={copyToClipboard}
      className="absolute top-2 right-2 rounded-md bg-gray-700 p-1 transition-colors hover:bg-gray-600"
    >
      {isCopied ? (
        <FiCheck className="h-4 w-4 text-green-500" />
      ) : (
        <FiCopy className="h-4 w-4 text-gray-300" />
      )}
    </button>
  )
})

const CodeBlock = memo(
  ({ language, value }: { language: string; value: string }) => {
    return (
      <div className="relative">
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md"
        >
          {value}
        </SyntaxHighlighter>
        <CopyButton text={value} />
      </div>
    )
  }
)

interface MarkdownWrapperProps {
  text: string
}

const MarkdownWrapper = memo(({ text }: MarkdownWrapperProps) => {
  const components = useMemo(
    () => ({
      ol: ({
        ordered,
        ...props
      }: { ordered?: boolean } & React.ComponentPropsWithoutRef<'ol'>) => (
        <ol className="list-decimal space-y-2 pl-6" {...props} />
      ),
      ul: ({
        ordered,
        ...props
      }: { ordered?: boolean } & React.ComponentPropsWithoutRef<'ul'>) => (
        <ul className="list-disc space-y-2 pl-6" {...props} />
      ),
      li: ({
        ordered,
        ...props
      }: { ordered?: boolean } & React.ComponentPropsWithoutRef<'li'>) => (
        <li className="ml-2" {...props} />
      ),
      code: ({
        inline,
        className,
        children,
        ...props
      }: React.ComponentPropsWithoutRef<'code'> & {
        inline?: boolean
      }) => {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
          <CodeBlock
            language={match[1]}
            value={String(children).replace(/\n$/, '')}
          />
        ) : (
          <code
            {...props}
            className={`${className} rounded bg-gray-100 px-1 dark:bg-gray-800`}
          >
            {children}
          </code>
        )
      },
    }),
    []
  )

  // Memoize plugins
  const remarkPlugins = useMemo(() => [remarkMath] as Array<any>, [])
  const rehypePlugins = useMemo(() => [rehypeKatex] as Array<any>, [])

  if (!text) return null

  return (
    <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100" />}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </Suspense>
  )
})

CopyButton.displayName = 'CopyButton'
CodeBlock.displayName = 'CodeBlock'
MarkdownWrapper.displayName = 'MarkdownWrapper'

export default MarkdownWrapper
