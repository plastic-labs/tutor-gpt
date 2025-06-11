import React, {
  useState,
  useCallback,
  useMemo,
  memo,
  lazy,
  Suspense,
} from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { FiCopy, FiCheck } from 'react-icons/fi';

const ReactMarkdown = lazy(() => import('react-markdown'));

const CopyButton = memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copyToClipboard}
      className="absolute top-2 right-2 p-1 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
    >
      {isCopied ? (
        <FiCheck className="h-4 w-4 text-green-500" />
      ) : (
        <FiCopy className="h-4 w-4 text-gray-300" />
      )}
    </button>
  );
});

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
    );
  }
);

interface MarkdownWrapperProps {
  text: string;
}

const MarkdownWrapper = memo(({ text }: MarkdownWrapperProps) => {
  const components = useMemo(
    () => ({
      ol: ({
        ordered,
        ...props
      }: { ordered?: boolean } & React.ComponentPropsWithoutRef<'ol'>) => (
        <ol className="list-decimal pl-6 space-y-2" {...props} />
      ),
      ul: ({
        ordered,
        ...props
      }: { ordered?: boolean } & React.ComponentPropsWithoutRef<'ul'>) => (
        <ul className="list-disc pl-6 space-y-2" {...props} />
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
        inline?: boolean;
      }) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <CodeBlock
            language={match[1]}
            value={String(children).replace(/\n$/, '')}
          />
        ) : (
          <code
            {...props}
            className={`${className} bg-gray-100 dark:bg-gray-800 rounded px-1`}
          >
            {children}
          </code>
        );
      },
    }),
    []
  );

  // Memoize plugins
  const remarkPlugins = useMemo(() => [remarkMath] as Array<any>, []);
  const rehypePlugins = useMemo(() => [rehypeKatex] as Array<any>, []);

  if (!text) return null;

  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-100 h-32" />}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </Suspense>
  );
});

CopyButton.displayName = 'CopyButton';
CodeBlock.displayName = 'CodeBlock';
MarkdownWrapper.displayName = 'MarkdownWrapper';

export default MarkdownWrapper;
