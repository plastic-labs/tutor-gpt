import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Typing from "./typing";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { FiCopy, FiCheck } from "react-icons/fi";

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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
}

function CodeBlock({ language, value }: { language: string; value: string }) {
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

export default function MarkdownWrapper({ text }: { text: string }) {
  return text ? (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      // @ts-expect-error i think typing is wrong from the library itself, this comment should raise an error once its fixed. // TODO: remove this comment
      rehypePlugins={[rehypeKatex]}
      components={{
        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-2" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-2" {...props} />,
        li: ({ node, ...props }) => <li className="ml-2" {...props} />,
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
          ) : (
            <code {...props} className={`${className} bg-gray-100 dark:bg-gray-800 rounded px-1`}>
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  ) : (
    <Typing />
  );
}
