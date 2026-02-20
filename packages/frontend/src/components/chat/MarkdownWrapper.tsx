import { memo, Suspense, lazy, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';

const SyntaxHighlighter = lazy(
  () => import('react-syntax-highlighter').then((mod) => ({ default: mod.Prism }))
);

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 bg-muted/80 hover:bg-muted rounded text-xs"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className ?? '');
  const code = String(children).replace(/\n$/, '');

  if (!match) {
    return (
      <code className="px-1.5 py-0.5 bg-muted rounded text-sm" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <CopyButton text={code} />
      <Suspense fallback={<pre className="p-4 bg-muted rounded overflow-x-auto text-sm"><code>{code}</code></pre>}>
        <SyntaxHighlighter
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Suspense>
    </div>
  );
}

interface MarkdownWrapperProps {
  text: string;
}

export const MarkdownWrapper = memo(function MarkdownWrapper({ text }: MarkdownWrapperProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code: CodeBlock as any,
        ul: ({ children }) => (
          <ul className="list-disc pl-6 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 space-y-1">{children}</ol>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
});
