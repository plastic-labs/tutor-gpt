// Imports commented out since summarization is disabled
// import { streamText } from '@/utils/ai'
// import { buildSummaryPrompt } from '@/utils/ai/prompts'
// import { honcho, summarizer } from '@/utils/honcho'

export async function checkAndGenerateSummary(
  sessionId: string,
  userId: string,
  messageHistory: any[]
) {
  // Commented out - letting honcho handle auto-summarization
  return

  /* 
  try {
    // Check if we need to generate a summary (every 10 messages)
    if (messageHistory.length % 10 !== 0) {
      return
    }

    const session = await honcho.session(sessionId)

    // Get context for summary generation
    const context = await session.getContext({
      summary: false,
      tokens: 4000,
    })

    // Generate summary prompt
    const summaryPrompt = buildSummaryPrompt(context.messages)

    // Generate summary
    const { textStream: summaryStream } = streamText({
      messages: summaryPrompt,
      metadata: {
        sessionId,
        userId,
        type: 'summary',
      },
    })

    let summary = ''
    for await (const chunk of summaryStream) {
      summary += chunk
    }

    // Add summary message to session
    await session.addMessages([summarizer.message(summary)])

    console.log('Generated summary for session:', sessionId)
  } catch (error) {
    console.error('Error generating summary:', error)
  }
  */
}
