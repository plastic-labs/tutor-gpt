import { useState } from 'react';
import { ChevronDown, Search, BookOpen, MessageCircle, FileText } from 'lucide-react';
import type { ThinkingData } from '@bloom/shared/types';

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
}

interface ThinkBoxProps {
  toolCalls: ToolCall[];
  finished: boolean;
  historicalData?: ThinkingData;
}

const TOOL_ICONS: Record<string, typeof Search> = {
  queryStudentContext: MessageCircle,
  searchWeb: Search,
  searchDocuments: FileText,
  readDocument: BookOpen,
  createArtifact: FileText,
  updateArtifact: FileText,
};

const TOOL_LABELS: Record<string, string> = {
  queryStudentContext: 'Consulting student profile',
  searchWeb: 'Researching',
  searchDocuments: 'Searching documents',
  readDocument: 'Reading document',
  createArtifact: 'Creating document',
  updateArtifact: 'Updating document',
};

export function ThinkBox({ toolCalls, finished, historicalData }: ThinkBoxProps) {
  const [collapsed, setCollapsed] = useState(finished);

  const hasContent = toolCalls.length > 0 || historicalData;
  if (!hasContent && finished) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
        {!finished ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            Thinking...
          </span>
        ) : (
          <span>Thought about it</span>
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {/* Active tool calls */}
          {toolCalls.map((tc, i) => {
            const Icon = TOOL_ICONS[tc.tool] ?? Search;
            const label = TOOL_LABELS[tc.tool] ?? tc.tool;

            return (
              <div key={i} className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>
                    {label}
                    {tc.args.query ? `: "${tc.args.query}"` : ''}
                  </span>
                  {!tc.result && (
                    <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                  )}
                </div>
                {tc.result && (
                  <div className="ml-4.5 px-2 py-1 bg-muted rounded text-muted-foreground max-h-24 overflow-y-auto">
                    {tc.result.slice(0, 300)}
                    {tc.result.length > 300 && '...'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Historical thinking data */}
          {historicalData && (
            <div className="text-xs space-y-2 text-muted-foreground">
              {historicalData.thoughtContent && (
                <div>
                  <span className="font-medium">Thought:</span>{' '}
                  {historicalData.thoughtContent.slice(0, 200)}
                  {historicalData.thoughtContent.length > 200 && '...'}
                </div>
              )}
              {historicalData.honchoResponse && (
                <div>
                  <span className="font-medium">Student insight:</span>{' '}
                  {historicalData.honchoResponse.slice(0, 200)}
                  {historicalData.honchoResponse.length > 200 && '...'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
