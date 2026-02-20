// Exa web search tool via official Vercel AI SDK integration
// Requires EXA_API_KEY env var

let exaResearchTool: ReturnType<typeof import('@exalabs/ai-sdk').webSearch> | undefined;

try {
  // Dynamic import to avoid hard failure if package isn't installed yet
  const { webSearch } = await import('@exalabs/ai-sdk');
  exaResearchTool = webSearch({
    type: 'auto',
    numResults: 5,
    contents: {
      text: { maxCharacters: 2000 },
      summary: true,
      livecrawl: 'fallback',
    },
  });
} catch {
  console.warn('Exa SDK not available, web search tool disabled');
}

export { exaResearchTool };
